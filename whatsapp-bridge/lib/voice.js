/**
 * lib/voice.js
 *
 * Voice-chat orchestration: one place that decides which engine handles a
 * voice note in, and which produces the voice reply out, and makes sure the
 * bytes handed to WhatsApp are in a format it will actually play.
 *
 *   IN  (ASR):  Bhashini IndicConformer  →  Gemini (multimodal) fallback
 *   OUT (TTS):  Bhashini IndicTTS        →  Gemini TTS fallback
 *               then → OGG/Opus via ffmpeg (WhatsApp voice-note format)
 *
 * Every function returns null instead of throwing: a voice failure must never
 * block the text reply, which is the safety-critical channel.
 */

import { transcribeBhashini, synthesizeBhashini, isBhashiniConfigured, isBhashiniLanguage, cleanTextForTTS, trimForSpeech } from './bhashini.js';
import { transcribeVoiceNote } from './asr.js';
import { hasFfmpeg, detectAudioFormat, toWav16kMono, toOggOpus } from './audioConvert.js';
import { allowFrontier } from './coreMode.js';

const GEMINI_TTS_SAMPLE_RATE = 24000; // Gemini TTS returns 16-bit mono PCM @ 24 kHz

/** Voice replies can be switched off without a deploy. */
export function isVoiceReplyEnabled() {
  return String(process.env.VOICE_REPLY_ENABLED ?? 'true').toLowerCase() !== 'false';
}

/**
 * Pick the TTS language from the script the reply is actually written in.
 * The profile locale can disagree with the reply (user asked in English with
 * a Telugu profile), and a Telugu voice reading English text is gibberish.
 */
export function detectSpeechLanguage(text, fallback = 'en') {
  const scripts = [
    ['te', /[\u0C00-\u0C7F]/g],
    ['hi', /[\u0900-\u097F]/g],
    ['ta', /[\u0B80-\u0BFF]/g],
    ['kn', /[\u0C80-\u0CFF]/g],
    ['ml', /[\u0D00-\u0D7F]/g],
    ['bn', /[\u0980-\u09FF]/g],
    ['gu', /[\u0A80-\u0AFF]/g],
    ['pa', /[\u0A00-\u0A7F]/g],
    ['or', /[\u0B00-\u0B7F]/g],
    ['ur', /[\u0600-\u06FF]/g],
  ];
  const s = String(text || '');
  let best = null;
  let bestCount = 0;
  for (const [lang, re] of scripts) {
    const n = (s.match(re) || []).length;
    if (n > bestCount) { best = lang; bestCount = n; }
  }
  if (best && bestCount >= 3) {
    if (best === 'ur' && fallback === 'ar') return 'ar';
    return best;
  }
  const latin = (s.match(/[a-z]/gi) || []).length;
  return latin >= 3 ? 'en' : fallback;
}

export { cleanTextForTTS, trimForSpeech };

// ── IN: speech → text ─────────────────────────────────────────────────────

/**
 * Translate native language text to English for clinical router & safety processing.
 */
export async function translateTextToEnglish(text, sourceLang = 'en') {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  const latinCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
  const nonLatinCount = (trimmed.match(/[^\x00-\x7F]/g) || []).length;
  if (latinCount > 10 && nonLatinCount < 3) return trimmed;

  const ollamaUrl = process.env.MEDGEMMA_API_URL || process.env.DAYLI_OLLAMA_URL || 'http://127.0.0.1:11434';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    const res = await fetch(`${ollamaUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.MEDGEMMA_MODEL || 'medgemma:latest',
        messages: [
          {
            role: 'system',
            content: 'You are a clinical multilingual translator. Translate the patient message accurately into clear English. Retain all symptoms, age, duration, and medical nuance. Output ONLY the English translation without preamble.',
          },
          { role: 'user', content: trimmed },
        ],
        temperature: 0.1,
        max_tokens: 300,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      const translated = data?.choices?.[0]?.message?.content?.trim();
      if (translated) {
        console.log(`[voice] translated (${sourceLang} -> en): ${translated.slice(0, 80)}...`);
        return translated;
      }
    }
  } catch (err) {
    console.warn(`[voice] local translation fallback error: ${err.message}`);
  }
  return trimmed;
}

/**
 * @param {Buffer} buffer - Voice note bytes from Meta (OGG/Opus)
 * @param {string} mimeType
 * @param {string} locale - profile language, used as a hint
 * @returns {Promise<{ text: string, englishText: string, lang: string, provider: 'bhashini'|'gemini' } | null>}
 */
export async function transcribeVoice(buffer, mimeType, locale = 'en') {
  if (!buffer?.length) return null;

  let nativeText = null;
  let englishText = null;
  let detectedLang = locale;
  let provider = 'gemini';

  if (isBhashiniConfigured() && isBhashiniLanguage(locale)) {
    let audio = buffer;
    let audioFormat = detectAudioFormat(buffer) === 'wav' ? 'wav' : 'ogg';
    let samplingRate = 16000;
    // Bhashini's conformer models are trained on 16 kHz PCM; Opus is 48 kHz.
    if (audioFormat !== 'wav' && (await hasFfmpeg())) {
      try {
        audio = await toWav16kMono(buffer);
        audioFormat = 'wav';
      } catch (err) {
        console.warn(`[voice] ASR wav conversion failed, sending original: ${err.message}`);
        samplingRate = 48000;
      }
    } else if (audioFormat !== 'wav') {
      samplingRate = 48000;
    }
    const t = await transcribeBhashini(audio, locale, { audioFormat, samplingRate });
    if (t) {
      nativeText = t;
      provider = 'bhashini';
      detectedLang = locale;
    }
  }

  if (!nativeText) {
    const asr = await transcribeVoiceNote(buffer, mimeType, locale);
    if (asr) {
      if (typeof asr === 'object' && asr.text) {
        nativeText = asr.text;
        englishText = asr.englishText;
        detectedLang = asr.lang || detectSpeechLanguage(nativeText, locale);
      } else if (typeof asr === 'string') {
        nativeText = asr;
        detectedLang = detectSpeechLanguage(nativeText, locale);
      }
      provider = 'gemini';
    }
  }

  if (!nativeText) return null;

  if (!englishText) {
    englishText = await translateTextToEnglish(nativeText, detectedLang);
  }

  return {
    text: nativeText,
    englishText: englishText || nativeText,
    lang: detectedLang,
    provider,
  };
}

// ── OUT: text → speech ────────────────────────────────────────────────────

/**
 * ElevenLabs Multilingual v2 TTS. Returns MP3 buffer or null.
 * Provides natural, warm voices for Telugu, Hindi, Arabic, English, etc.
 */
export async function synthesizeElevenLabs(text) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;
  const clean = trimForSpeech(cleanTextForTTS(text));
  if (!clean || clean.length < 2) return null;

  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'Xb7hH8MSUJpSbSDYk0k2';
  const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    parseInt(process.env.ELEVENLABS_TIMEOUT_MS || '15000', 10)
  );

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: clean.slice(0, 900),
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`[ElevenLabs TTS] HTTP ${res.status}: ${errText.slice(0, 100)}`);
      return null;
    }

    const arrayBuf = await res.arrayBuffer();
    console.log(`[ElevenLabs TTS] Synthesized ${clean.length} chars (${arrayBuf.byteLength} bytes)`);
    return Buffer.from(arrayBuf);
  } catch (err) {
    clearTimeout(timer);
    console.warn(`[ElevenLabs TTS] error: ${err.message}`);
    return null;
  }
}

/**
 * Gemini TTS. Returns raw 16-bit PCM @ 24 kHz, or null.
 * Speaks Telugu, Hindi and English (auto-detected from the text).
 */
export async function synthesizeGemini(text) {
  if (!allowFrontier()) return null;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const clean = trimForSpeech(cleanTextForTTS(text));
  if (!clean || clean.length < 2) return null;

  const model = (process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts').trim();
  const voiceName = process.env.GEMINI_TTS_VOICE || 'Kore';
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    parseInt(process.env.GEMINI_TTS_TIMEOUT_MS || '20000', 10)
  );

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Say in a warm, calm and caring voice: ${clean}` }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
          },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      console.warn(`[Gemini TTS] HTTP ${res.status}: ${t.slice(0, 120)}`);
      return null;
    }
    const data = await res.json();
    const b64 = data?.candidates?.[0]?.content?.parts?.find((p) => p?.inlineData?.data)?.inlineData?.data;
    if (!b64) {
      console.warn('[Gemini TTS] no audio in response');
      return null;
    }
    console.log(`[Gemini TTS] Synthesized ${clean.length} chars`);
    return Buffer.from(b64, 'base64');
  } catch (err) {
    clearTimeout(timer);
    console.error(`[Gemini TTS] ${err?.name === 'AbortError' ? 'timeout' : 'error'}: ${err.message}`);
    return null;
  }
}

/**
 * Make TTS output uploadable to WhatsApp.
 * @returns {Promise<{ buffer: Buffer, mimeType: string, filename: string } | null>}
 */
export async function toWhatsAppAudio(buffer, { rawPcmSampleRate } = {}) {
  if (!buffer?.length) return null;
  const format = rawPcmSampleRate ? 'pcm' : detectAudioFormat(buffer);

  if (format === 'ogg') {
    return { buffer, mimeType: 'audio/ogg', filename: 'dayli_voice_reply.ogg' };
  }
  if (await hasFfmpeg()) {
    try {
      const ogg = await toOggOpus(buffer, { rawPcmSampleRate });
      return { buffer: ogg, mimeType: 'audio/ogg', filename: 'dayli_voice_reply.ogg' };
    } catch (err) {
      console.warn(`[voice] OGG/Opus conversion failed: ${err.message}`);
    }
  }
  // Without ffmpeg only MP3 is directly playable (as an audio file, not a voice bubble).
  if (format === 'mp3') {
    return { buffer, mimeType: 'audio/mpeg', filename: 'dayli_voice_reply.mp3' };
  }
  console.warn(`[voice] cannot deliver ${format} audio to WhatsApp — install ffmpeg`);
  return null;
}

/**
 * Produce a WhatsApp-ready voice reply for `text`.
 * @param {string} text - The reply text that is also sent as a message
 * @param {string} locale - profile locale, fallback when the script is ambiguous
 * @returns {Promise<{ buffer: Buffer, mimeType: string, filename: string, provider: string, lang: string } | null>}
 */
export async function buildVoiceReply(text, locale = 'en') {
  if (!isVoiceReplyEnabled() || !text) return null;
  const lang = detectSpeechLanguage(text, locale);
  const ffmpeg = await hasFfmpeg();

  // 1. ElevenLabs Multilingual v2 (Warm, expressive natural voice)
  if (process.env.ELEVENLABS_API_KEY) {
    const audio = await synthesizeElevenLabs(text);
    const out = audio && (await toWhatsAppAudio(audio));
    if (out) return { ...out, provider: 'elevenlabs', lang };
  }

  // 2. Bhashini IndicTTS (Indian voices)
  if (isBhashiniConfigured() && isBhashiniLanguage(lang)) {
    // With ffmpeg take WAV (lossless, then one Opus encode); without it ask
    // for MP3, the only Bhashini output WhatsApp can play unconverted.
    const audio = await synthesizeBhashini(text, lang, null, { audioFormat: ffmpeg ? 'wav' : 'mp3' });
    const out = audio && (await toWhatsAppAudio(audio));
    if (out) return { ...out, provider: 'bhashini', lang };
  }

  // 3. Gemini TTS — PCM output, so it needs ffmpeg to become playable.
  if (ffmpeg && process.env.GEMINI_API_KEY && process.env.GEMINI_TTS_ENABLED !== 'false') {
    const pcm = await synthesizeGemini(text);
    const out = pcm && (await toWhatsAppAudio(pcm, { rawPcmSampleRate: GEMINI_TTS_SAMPLE_RATE }));
    if (out) return { ...out, provider: 'gemini', lang };
  }

  return null;
}
