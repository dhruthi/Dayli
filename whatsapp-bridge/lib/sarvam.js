/**
 * lib/sarvam.js
 *
 * Sarvam AI integration for Dayli AI:
 *   1. ASR (Saaras v3) — Voice to Text for 11+ Indian languages
 *   2. TTS (Bulbul v3) — Text to Natural Voice Audio
 *
 * Auth: single API-Subscription-Key header (from sarvam.ai dashboard).
 * ASR accepts multipart/form-data audio file (OGG/WAV/MP3/FLAC).
 * TTS accepts JSON with inputs: [text], returns base64 WAV.
 */

import { cleanTextForTTS, trimForSpeech } from './bhashini.js';
import { detectAudioFormat } from './audioConvert.js';

const TIMEOUT_MS = () => parseInt(process.env.SARVAM_TIMEOUT_MS || '15000', 10);
const TTS_MAX_CHARS = () => parseInt(process.env.SARVAM_TTS_MAX_CHARS || '600', 10);

export const SARVAM_LANGUAGES = new Set([
  'hi', 'bn', 'kn', 'ml', 'mr', 'od', 'pa', 'ta', 'te', 'gu', 'en',
]);

const LANG_MAP = {
  hi: 'hi-IN', bn: 'bn-IN', kn: 'kn-IN', ml: 'ml-IN', mr: 'mr-IN',
  od: 'od-IN', pa: 'pa-IN', ta: 'ta-IN', te: 'te-IN', gu: 'gu-IN',
  en: 'en-IN', or: 'od-IN',
};

function toSarvamCode(lang) {
  return LANG_MAP[String(lang || '').toLowerCase()] || null;
}

export function isSarvamConfigured() {
  return Boolean(process.env.SARVAM_API_KEY);
}

export function isSarvamLanguage(lang) {
  const code = String(lang || '').toLowerCase();
  return SARVAM_LANGUAGES.has(code) || code === 'or';
}

// ── ASR: Saaras v3 ──────────────────────────────────────────────────────

/**
 * @param {Buffer} audioBuffer - Audio bytes (OGG/Opus, WAV, MP3, or FLAC)
 * @param {string} [languageCode] - 2-letter locale code
 * @param {{ model?: string }} [opts]
 * @returns {Promise<string|null>} Transcribed text or null
 */
export async function transcribeSarvam(audioBuffer, languageCode, opts = {}) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey || !audioBuffer?.length) return null;

  const sarvamLang = toSarvamCode(languageCode);
  if (!sarvamLang) return null;

  const model = opts.model || process.env.SARVAM_ASR_MODEL || 'saaras:v3';
  const endpoint = process.env.SARVAM_ASR_ENDPOINT || 'https://api.sarvam.ai/speech-to-text';

  const format = detectAudioFormat(audioBuffer);
  const ext = format === 'unknown' ? 'wav' : format;
  const mime = format === 'ogg' ? 'audio/ogg' : format === 'mp3' ? 'audio/mpeg' : 'audio/wav';

  const form = new FormData();
  const blob = new Blob([audioBuffer], { type: mime });
  form.append('file', blob, `audio.${ext}`);
  if (sarvamLang) form.append('language_code', sarvamLang);
  if (model) form.append('model', model);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS());

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'API-Subscription-Key': apiKey,
      },
      body: form,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`[sarvam ASR] HTTP ${res.status}: ${errText.slice(0, 150)}`);
      return null;
    }

    const data = await res.json();
    const transcript = data?.transcript?.trim();
    if (!transcript) {
      console.warn('[sarvam ASR] empty transcript in response');
      return null;
    }

    console.log(`[sarvam ASR] transcribed ${sarvamLang || 'auto'}: ${transcript.slice(0, 80)}...`);
    return transcript;
  } catch (err) {
    clearTimeout(timer);
    console.warn(`[sarvam ASR] ${err?.name === 'AbortError' ? 'timeout' : 'error'}: ${err.message}`);
    return null;
  }
}

// ── TTS: Bulbul v3 ──────────────────────────────────────────────────────

/**
 * @param {string} text - Text to speak
 * @param {string} languageCode - 2-letter locale code
 * @param {{ speaker?: string, model?: string }} [opts]
 * @returns {Promise<Buffer|null>} WAV audio buffer or null
 */
export async function synthesizeSarvam(text, languageCode, opts = {}) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) return null;

  const sarvamLang = toSarvamCode(languageCode);
  if (!sarvamLang) return null;

  const clean = trimForSpeech(cleanTextForTTS(text), TTS_MAX_CHARS());
  if (!clean || clean.length < 2) return null;

  const model = opts.model || process.env.SARVAM_TTS_MODEL || 'bulbul:v3';
  const speaker = opts.speaker || process.env.SARVAM_TTS_SPEAKER || 'kavya';
  const endpoint = process.env.SARVAM_TTS_ENDPOINT || 'https://api.sarvam.ai/text-to-speech';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS());

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-Subscription-Key': apiKey,
      },
      body: JSON.stringify({
        inputs: [clean],
        target_language_code: sarvamLang,
        speaker,
        model,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`[sarvam TTS] HTTP ${res.status}: ${errText.slice(0, 150)}`);
      return null;
    }

    const data = await res.json();
    const b64Audio = data?.audios?.[0];
    if (!b64Audio) {
      console.warn('[sarvam TTS] no audio in response');
      return null;
    }

    const buf = Buffer.from(b64Audio, 'base64');
    console.log(`[sarvam TTS] synthesized ${clean.length} chars (${buf.length} bytes)`);
    return buf;
  } catch (err) {
    clearTimeout(timer);
    console.warn(`[sarvam TTS] ${err?.name === 'AbortError' ? 'timeout' : 'error'}: ${err.message}`);
    return null;
  }
}

