/**
 * lib/bhashini.js
 *
 * Project Bhashini (National Language Translation Mission / AI4Bharat)
 * Integration for Dayli AI:
 *   1. ASR (Automatic Speech Recognition) - Voice to Text (IndicConformer)
 *   2. TTS (Text-to-Speech) - Text to Natural Voice Audio (IndicTTS)
 *
 * Supports 22 Indian languages including Telugu (te), Hindi (hi), Tamil (ta),
 * Kannada (kn), Marathi (mr), Bengali (bn), and Indian English (en).
 *
 * AUTH FLOW (two steps — this is how Bhashini actually works):
 *   1. POST the ULCA "pipeline config" endpoint with headers
 *      `userID` + `ulcaApiKey` (from the Bhashini dashboard). It answers with
 *      the serviceId to use for the task/language, the inference callbackUrl,
 *      and an `inferenceApiKey` { name, value }.
 *   2. POST the callbackUrl (Dhruva) with header `<name>: <value>`.
 *   Sending the ULCA key straight to Dhruva is rejected with 401.
 *
 * Step-1 results are cached per task+language for BHASHINI_CONFIG_TTL_MS.
 *
 * Shortcut: if BHASHINI_INFERENCE_API_KEY is set (a Dhruva key issued
 * directly), step 1 is skipped and the default endpoint + service ids are used.
 */

const DEFAULT_BHASHINI_ENDPOINT = 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline';
const DEFAULT_CONFIG_URL = 'https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline';
// MeitY's public pipeline that bundles ASR / NMT / TTS for all Indic languages.
const DEFAULT_PIPELINE_ID = '64392f96daac500b55c543cd';

const BHASHINI_TIMEOUT_MS = () => parseInt(process.env.BHASHINI_TIMEOUT_MS || '15000', 10);
const CONFIG_TTL_MS = () => parseInt(process.env.BHASHINI_CONFIG_TTL_MS || String(6 * 60 * 60 * 1000), 10);
const TTS_MAX_CHARS = () => parseInt(process.env.BHASHINI_TTS_MAX_CHARS || '600', 10);

/** Languages Bhashini serves (ISO-639 codes it expects). */
export const BHASHINI_LANGUAGES = new Set([
  'as', 'bn', 'brx', 'doi', 'en', 'gu', 'hi', 'kn', 'ks', 'kok', 'mai', 'ml',
  'mni', 'mr', 'ne', 'or', 'pa', 'sa', 'sat', 'sd', 'ta', 'te', 'ur',
]);

const DRAVIDIAN = new Set(['te', 'ta', 'kn', 'ml']);

/**
 * Fallback service ids, used only with BHASHINI_INFERENCE_API_KEY (no config
 * step) or when the config response omits a serviceId.
 */
function defaultServiceId(taskType, lang) {
  if (taskType === 'asr') {
    if (lang === 'en') return 'ai4bharat/whisper-medium-en--gpu--t4';
    if (lang === 'hi') return 'ai4bharat/conformer-hi-gpu--t4';
    return DRAVIDIAN.has(lang)
      ? 'ai4bharat/conformer-multilingual-dravidian-gpu--t4'
      : 'ai4bharat/conformer-multilingual-indo_aryan-gpu--t4';
  }
  if (lang === 'en') return 'ai4bharat/indic-tts-coqui-misc-gpu--t4';
  return DRAVIDIAN.has(lang)
    ? 'ai4bharat/indic-tts-coqui-dravidian-gpu--t4'
    : 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4';
}

/**
 * Checks whether Bhashini credentials are configured in the environment.
 * @returns {boolean}
 */
export function isBhashiniConfigured() {
  return Boolean(
    (process.env.BHASHINI_API_KEY && process.env.BHASHINI_USER_ID) ||
      process.env.BHASHINI_INFERENCE_API_KEY
  );
}

/** Whether Bhashini can serve this language at all. */
export function isBhashiniLanguage(lang) {
  return BHASHINI_LANGUAGES.has(String(lang || '').toLowerCase());
}

// ── Pipeline config (auth step 1) ─────────────────────────────────────────

const configCache = new Map(); // `${task}:${lang}` -> { value, expiresAt }

/** Test hook. */
export function _resetBhashiniCache() {
  configCache.clear();
}

async function fetchWithTimeout(url, opts) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BHASHINI_TIMEOUT_MS());
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolve { serviceId, endpoint, authHeaderName, authHeaderValue } for a task.
 * @param {'asr'|'tts'} taskType
 * @param {string} lang
 * @returns {Promise<object|null>}
 */
export async function getPipelineConfig(taskType, lang) {
  const serviceOverride =
    taskType === 'asr' ? process.env.BHASHINI_ASR_SERVICE_ID : process.env.BHASHINI_TTS_SERVICE_ID;

  // Direct Dhruva key: no config round-trip needed.
  if (process.env.BHASHINI_INFERENCE_API_KEY) {
    return {
      serviceId: serviceOverride || defaultServiceId(taskType, lang),
      endpoint: process.env.BHASHINI_PIPELINE_ENDPOINT || DEFAULT_BHASHINI_ENDPOINT,
      authHeaderName: 'Authorization',
      authHeaderValue: process.env.BHASHINI_INFERENCE_API_KEY,
    };
  }

  const userId = process.env.BHASHINI_USER_ID;
  const ulcaApiKey = process.env.BHASHINI_API_KEY;
  if (!userId || !ulcaApiKey) return null;

  const key = `${taskType}:${lang}`;
  const hit = configCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  try {
    const res = await fetchWithTimeout(process.env.BHASHINI_CONFIG_URL || DEFAULT_CONFIG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', userID: userId, ulcaApiKey },
      body: JSON.stringify({
        pipelineTasks: [{ taskType, config: { language: { sourceLanguage: lang } } }],
        pipelineRequestConfig: { pipelineId: process.env.BHASHINI_PIPELINE_ID || DEFAULT_PIPELINE_ID },
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      console.warn(`[Bhashini config] HTTP ${res.status} for ${key}: ${t.slice(0, 120)}`);
      return null;
    }
    const data = await res.json();
    const endpointInfo = data?.pipelineInferenceAPIEndPoint || {};
    const auth = endpointInfo.inferenceApiKey || {};
    const services = data?.pipelineResponseConfig?.[0]?.config || [];
    const match =
      services.find((s) => s?.language?.sourceLanguage === lang) || services[0] || {};

    if (!auth.value) {
      console.warn(`[Bhashini config] no inferenceApiKey returned for ${key}`);
      return null;
    }

    const value = {
      serviceId: serviceOverride || match.serviceId || defaultServiceId(taskType, lang),
      endpoint: endpointInfo.callbackUrl || process.env.BHASHINI_PIPELINE_ENDPOINT || DEFAULT_BHASHINI_ENDPOINT,
      authHeaderName: auth.name || 'Authorization',
      authHeaderValue: auth.value,
    };
    configCache.set(key, { value, expiresAt: Date.now() + CONFIG_TTL_MS() });
    return value;
  } catch (err) {
    console.error(`[Bhashini config] ${err?.name === 'AbortError' ? 'timeout' : 'error'}: ${err.message}`);
    return null;
  }
}

/** POST a task to the inference endpoint. Invalidates cached auth on 401/403. */
async function runInference(taskType, lang, pipelineTask, inputData) {
  const cfg = await getPipelineConfig(taskType, lang);
  if (!cfg) return null;

  const body = {
    pipelineTasks: [{ ...pipelineTask, config: { ...pipelineTask.config, serviceId: cfg.serviceId } }],
    inputData,
  };

  const tag = taskType.toUpperCase();
  try {
    const res = await fetchWithTimeout(cfg.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', [cfg.authHeaderName]: cfg.authHeaderValue },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) configCache.delete(`${taskType}:${lang}`);
      const errText = await res.text().catch(() => '');
      console.warn(`[Bhashini ${tag}] HTTP ${res.status}: ${errText.slice(0, 120)}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`[Bhashini ${tag}] ${err?.name === 'AbortError' ? 'timeout' : 'error'}: ${err.message}`);
    return null;
  }
}

// ── Text helpers ──────────────────────────────────────────────────────────

/**
 * Strips markdown formatting, asterisks, URLs, and excessive emojis to
 * produce clean phonetic text for IndicTTS speech synthesis.
 *
 * @param {string} text - Raw markdown WhatsApp text
 * @returns {string} Clean plain text suitable for speech synthesis
 */
export function cleanTextForTTS(text) {
  if (!text) return '';
  return text
    // Remove URLs — read aloud they are noise
    .replace(/https?:\/\/\S+/gi, '')
    // Remove markdown bold and italics (*text*, _text_)
    .replace(/[*_~`]/g, '')
    // Remove all emojis, symbols, and variation selectors
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[\uFE00-\uFE0F\u200D]/gu, '')
    // Remove bullet points and dashes
    .replace(/^[•\-\*]\s+/gm, '')
    .replace(/[•\-\*]\s+/g, '')
    // Each line becomes its own sentence, without doubling existing punctuation
    .replace(/([.!?।:])\s*\n+/g, '$1 ')
    .replace(/\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?।])/g, '$1')
    .replace(/\.{2,}/g, '.')
    .trim();
}

/**
 * Shorten text for speech without cutting a sentence in half — a clinical
 * instruction severed mid-sentence can change its meaning.
 */
export function trimForSpeech(text, maxChars = TTS_MAX_CHARS()) {
  const t = String(text || '').trim();
  if (t.length <= maxChars) return t;
  const slice = t.slice(0, maxChars);
  const lastEnd = Math.max(
    slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '),
    slice.lastIndexOf('। '), slice.lastIndexOf('.'), slice.lastIndexOf('।')
  );
  if (lastEnd > maxChars * 0.4) return slice.slice(0, lastEnd + 1).trim();
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trim();
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Model 1: Speech-to-Text (ASR) via Bhashini IndicConformer
 * Transcribes audio bytes in an Indian language into plain text.
 *
 * @param {Buffer|Uint8Array} audioBuffer - Audio bytes (WAV 16k preferred, or OGG)
 * @param {string} languageCode - 'te' | 'hi' | 'ta' | 'kn' | 'en'
 * @param {{ audioFormat?: string, samplingRate?: number }} [opts]
 * @returns {Promise<string|null>} Transcribed text or null
 */
export async function transcribeBhashini(audioBuffer, languageCode = 'te', opts = {}) {
  if (!isBhashiniConfigured()) return null;

  if (!audioBuffer || !audioBuffer.length) {
    console.warn('[Bhashini ASR] empty audio buffer received');
    return null;
  }

  const lang = (languageCode || 'te').toLowerCase();
  if (!isBhashiniLanguage(lang)) return null;

  const audioBase64 = Buffer.isBuffer(audioBuffer)
    ? audioBuffer.toString('base64')
    : Buffer.from(audioBuffer).toString('base64');

  const data = await runInference(
    'asr',
    lang,
    {
      taskType: 'asr',
      config: {
        language: { sourceLanguage: lang },
        audioFormat: opts.audioFormat || 'ogg',
        samplingRate: opts.samplingRate || 16000,
      },
    },
    { audio: [{ audioContent: audioBase64 }] }
  );
  if (!data) return null;

  const transcript =
    data.pipelineResponse?.[0]?.output?.[0]?.source ||
    data.pipelineResponse?.[0]?.output?.[0]?.text ||
    null;

  if (transcript) {
    console.log(`[Bhashini ASR] Transcribed (${lang}): ${transcript.length} chars`);
  }
  return transcript ? transcript.trim() || null : null;
}

/**
 * Model 2: Text-to-Speech (TTS) via Bhashini IndicTTS
 * Converts text into natural spoken Indian language audio (female or male voice).
 *
 * @param {string} text - Response text to speak
 * @param {string} languageCode - 'te' | 'hi' | 'ta' | 'kn' | 'en'
 * @param {'female'|'male'} gender - Preferred voice gender (defaults to 'female')
 * @param {{ audioFormat?: 'wav'|'mp3' }} [opts]
 * @returns {Promise<Buffer|null>} Audio bytes (WAV by default) or null
 */
export async function synthesizeBhashini(text, languageCode = 'te', gender = null, opts = {}) {
  if (!isBhashiniConfigured()) return null;

  const cleanText = cleanTextForTTS(text);
  if (!cleanText || cleanText.length < 2) return null;

  const lang = (languageCode || 'te').toLowerCase();
  if (!isBhashiniLanguage(lang)) return null;

  const voiceGender = gender || process.env.BHASHINI_VOICE_GENDER || 'female';
  const ttsInputText = trimForSpeech(cleanText);

  const data = await runInference(
    'tts',
    lang,
    {
      taskType: 'tts',
      config: {
        language: { sourceLanguage: lang },
        gender: voiceGender,
        samplingRate: 22050,
        ...(opts.audioFormat ? { audioFormat: opts.audioFormat } : {}),
      },
    },
    { input: [{ source: ttsInputText }] }
  );
  if (!data) return null;

  const base64Audio =
    data.pipelineResponse?.[0]?.audio?.[0]?.audioContent ||
    data.pipelineResponse?.[0]?.output?.[0]?.audioContent ||
    null;

  if (!base64Audio) {
    console.warn('[Bhashini TTS] No audioContent in response');
    return null;
  }

  console.log(`[Bhashini TTS] Synthesized ${ttsInputText.length} chars (${lang}, ${voiceGender})`);
  return Buffer.from(base64Audio, 'base64');
}
