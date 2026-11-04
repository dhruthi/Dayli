/**
 * Voice note transcription using Gemini 2.0 Flash multimodal API.
 *
 * WhatsApp sends voice notes as audio/ogg (Opus codec). Gemini 2.0 Flash
 * accepts OGG/Opus natively via inlineData — no ffmpeg conversion required.
 *
 * Inline data limit: 20 MB. WhatsApp voice notes cap at ~16 MB.
 * A typical 30-second note is ~60 KB — well inside the limit.
 */

const DEFAULT_ASR_MODEL = 'gemini-2.0-flash';
const ASR_TIMEOUT_MS = parseInt(process.env.ASR_TIMEOUT_MS || '15000', 10);
const INAUDIBLE = '[[NO_SPEECH]]';

/**
 * Transcribe a voice note buffer using Gemini.
 *
 * @param {Buffer}  audioBuffer   Raw bytes from Meta's CDN (OGG/Opus)
 * @param {string}  mimeType      e.g. 'audio/ogg; codecs=opus'
 * @param {string}  locale        'te' | 'hi' | 'ar' | 'en'
 * @returns {Promise<string|null>} Transcript text, or null if transcription failed
 */
import { allowFrontier } from './coreMode.js';

export async function transcribeVoiceNote(audioBuffer, mimeType, locale = 'en') {
  if (!allowFrontier()) {
    console.warn('[ASR] Frontier API disabled in local mode');
    return null;
  }
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    console.warn('[ASR] GEMINI_API_KEY not set — voice transcription disabled');
    return null;
  }

  if (!audioBuffer || !audioBuffer.length) {
    console.warn('[ASR] empty audio buffer received');
    return null;
  }

  const model = (process.env.GEMINI_ASR_MODEL || DEFAULT_ASR_MODEL).trim();
  const asrUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  // Gemini requires the base MIME type (strip codec parameter, e.g. audio/ogg)
  const baseMime = (mimeType || 'audio/ogg').split(';')[0].trim();

  // Language hint in the prompt improves accuracy for Indian scripts
  const langHint =
    locale === 'te' ? 'Telugu'
    : locale === 'hi' ? 'Hindi'
    : locale === 'ar' ? 'Arabic or Urdu'
    : 'English';

  const audioBase64 = Buffer.isBuffer(audioBuffer)
    ? audioBuffer.toString('base64')
    : Buffer.from(audioBuffer).toString('base64');

  const body = {
    contents: [
      {
        parts: [
          {
            text:
              `Listen to this voice message. The speaker is likely using ${langHint}, ` +
              'but may use Telugu, Hindi, Arabic, English, or a mix. ' +
              '1. Transcribe the exact words in the native script (writing Indian languages in their native script). ' +
              '2. Translate the spoken message accurately into clear English for clinical health reasoning. ' +
              '3. Detect the primary language code (e.g. "te", "hi", "ar", "en", "ta", "kn", "bn"). ' +
              'Return JSON format: {"transcript": "...", "english": "...", "language": "..."}. ' +
              `If there is no intelligible speech, return exactly ${INAUDIBLE}.`,
          },
          {
            inlineData: {
              mimeType: baseMime,
              data: audioBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 512,
      responseMimeType: 'application/json',
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ASR_TIMEOUT_MS);

  try {
    const res = await fetch(`${asrUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[ASR] Gemini error ${res.status}: ${errText.slice(0, 120)}`);
      return null;
    }

    const data = await res.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!rawContent || rawContent.includes(INAUDIBLE)) {
      console.warn('[ASR] no intelligible speech in voice note');
      return null;
    }

    try {
      const parsed = JSON.parse(rawContent);
      if (parsed.transcript || parsed.english) {
        console.log(`[ASR] Transcribed & translated (${parsed.language || locale}): ${parsed.transcript?.length || 0} chars`);
        return {
          text: parsed.transcript || parsed.english,
          englishText: parsed.english || parsed.transcript,
          lang: parsed.language || locale,
        };
      }
    } catch {
      // Return raw content as string if non-JSON
    }

    console.log(`[ASR] Transcribed (${locale}): ${rawContent.length} chars`);
    return rawContent;
  } catch (err) {
    clearTimeout(timer);
    const timedOut = err?.name === 'AbortError';
    console.error(`[ASR] ${timedOut ? 'timeout' : 'error'}: ${err.message}`);
    return null;
  }
}
