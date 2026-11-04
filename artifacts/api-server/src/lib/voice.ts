import { Buffer } from "node:buffer";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { logger } from "./logger";

const execFileAsync = promisify(execFile);

export interface VoiceRecognitionResult {
  originalTranscript: string;
  englishTranscript: string;
  detectedLanguage: string;
  languageName: string;
  provider: "gemini" | "client_speech" | "medgemma";
}

export const LANGUAGE_META: Record<string, { name: string; nativeName: string; flag: string }> = {
  te: { name: "Telugu", nativeName: "తెలుగు", flag: "🇮🇳" },
  hi: { name: "Hindi", nativeName: "हिंदी", flag: "🇮🇳" },
  en: { name: "English", nativeName: "English", flag: "🌐" },
  ar: { name: "Arabic", nativeName: "العربية", flag: "🌍" },
  ta: { name: "Tamil", nativeName: "தமிழ்", flag: "🇮🇳" },
  kn: { name: "Kannada", nativeName: "ಕನ್ನಡ", flag: "🇮🇳" },
  bn: { name: "Bengali", nativeName: "বাংলা", flag: "🇮🇳" },
  mr: { name: "Marathi", nativeName: "मराठी", flag: "🇮🇳" },
};

/**
 * Detect language script from text.
 */
export function detectLanguageFromText(text: string, fallback = "en"): { code: string; name: string } {
  const scripts: [string, RegExp][] = [
    ["te", /[\u0C00-\u0C7F]/g],
    ["hi", /[\u0900-\u097F]/g],
    ["ar", /[\u0600-\u06FF]/g],
    ["ta", /[\u0B80-\u0BFF]/g],
    ["kn", /[\u0C80-\u0CFF]/g],
    ["bn", /[\u0980-\u09FF]/g],
  ];

  const s = String(text || "");
  let best = fallback;
  let maxCount = 0;

  for (const [code, regex] of scripts) {
    const matches = (s.match(regex) || []).length;
    if (matches > maxCount) {
      maxCount = matches;
      best = code;
    }
  }

  if (maxCount >= 3) {
    const meta = LANGUAGE_META[best];
    return { code: best, name: meta ? `${meta.name} (${meta.nativeName})` : best };
  }

  const meta = LANGUAGE_META[fallback] || LANGUAGE_META["en"];
  return { code: fallback, name: `${meta.name} (${meta.nativeName})` };
}

/**
 * Strip Markdown, links, and formatting symbols so speech synthesis sounds natural.
 */
export function cleanTextForTTS(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [label](url) -> label
    .replace(/https?:\/\/\S+/g, "") // strip raw URLs
    .replace(/^#+\s+/gm, "") // headers
    .replace(/[*_~`#]/g, "") // markdown markers
    .replace(/^\s*[-•*]\s+/gm, "") // bullet points
    .replace(/^\s*\d+\.\s+/gm, "") // numbered lists
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Translate user message to English using local MedGemma / Ollama (or Gemini if available).
 */
export async function translateToEnglish(text: string, sourceLang?: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";

  // Check if text is predominantly Latin/English already
  const latinCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
  const nonLatinCount = (trimmed.match(/[^\x00-\x7F]/g) || []).length;
  if (latinCount > 10 && nonLatinCount < 3) {
    return trimmed;
  }

  // 1. Try Ollama (MedGemma / local LLM)
  const ollamaUrl = process.env.MEDGEMMA_API_URL || process.env.DAYLI_OLLAMA_URL || "http://127.0.0.1:11434";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const res = await fetch(`${ollamaUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.MEDGEMMA_MODEL || "medgemma:latest",
        messages: [
          {
            role: "system",
            content:
              "You are a clinical multilingual translator. Translate the patient or caregiver message accurately into clear English. Retain all symptoms, age, duration, and medical nuance. Output ONLY the English translation without preamble.",
          },
          { role: "user", content: trimmed },
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
        logger.info({ sourceLang, translatedLen: translated.length }, "Translated message to English via local model");
        return translated;
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ err: msg }, "Local translation failed; trying Gemini fallback");
  }

  // 2. Try Gemini if configured
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey.startsWith("AIzaSy")) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Translate this message to English accurately for clinical health triage. Return only the English translation: "${trimmed}"`,
                },
              ],
            },
          ],
          generationConfig: { temperature: 0, maxOutputTokens: 300 },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const cand = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (cand) return cand;
      }
    } catch {
      // ignore
    }
  }

  return trimmed;
}

/**
 * Transcribe incoming audio and convert/translate into English.
 */
export async function transcribeAndTranslateVoice(opts: {
  audioBuffer?: Buffer;
  mimeType?: string;
  clientTranscript?: string;
  localeHint?: string;
}): Promise<VoiceRecognitionResult> {
  const { audioBuffer, mimeType, clientTranscript, localeHint = "en" } = opts;

  // If client already transcribed via browser SpeechRecognition
  if (clientTranscript && clientTranscript.trim().length > 0) {
    const detected = detectLanguageFromText(clientTranscript, localeHint);
    let english = clientTranscript.trim();

    if (detected.code !== "en") {
      english = await translateToEnglish(clientTranscript, detected.code);
    }

    return {
      originalTranscript: clientTranscript.trim(),
      englishTranscript: english,
      detectedLanguage: detected.code,
      languageName: detected.name,
      provider: "client_speech",
    };
  }

  // If audio buffer is provided, attempt Gemini 2.0 Flash Multimodal ASR + Translation
  const geminiKey = process.env.GEMINI_API_KEY;
  if (audioBuffer && audioBuffer.length > 0 && geminiKey && geminiKey.startsWith("AIzaSy")) {
    try {
      const baseMime = (mimeType || "audio/webm").split(";")[0].trim();
      const audioBase64 = audioBuffer.toString("base64");

      const prompt = `Listen to this voice message from a patient or mother.
1. Detect the language spoken (e.g. Telugu 'te', Hindi 'hi', Arabic 'ar', English 'en').
2. Transcribe exactly what they said in the native script (originalTranscript).
3. Translate it accurately into English for clinical processing (englishTranscript).
Respond ONLY in valid JSON format:
{
  "detectedLanguage": "te",
  "languageName": "Telugu",
  "originalTranscript": "...",
  "englishTranscript": "..."
}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inlineData: { mimeType: baseMime, data: audioBase64 } },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) {
          const parsed = JSON.parse(jsonText);
          if (parsed.originalTranscript || parsed.englishTranscript) {
            return {
              originalTranscript: parsed.originalTranscript || parsed.englishTranscript,
              englishTranscript: parsed.englishTranscript || parsed.originalTranscript,
              detectedLanguage: parsed.detectedLanguage || localeHint,
              languageName: parsed.languageName || LANGUAGE_META[parsed.detectedLanguage]?.name || "Local",
              provider: "gemini",
            };
          }
        }
      }
    } catch (err: unknown) {
      logger.warn({ err }, "Gemini multimodal ASR failed");
    }
  }

  // Fallback if audio cannot be transcribed directly and no client transcript
  return {
    originalTranscript: "Voice message received",
    englishTranscript: "Voice message received",
    detectedLanguage: localeHint,
    languageName: LANGUAGE_META[localeHint]?.name || "English",
    provider: "client_speech",
  };
}

/**
 * Synthesize voiceover using ElevenLabs Multilingual v2.
 */
export async function synthesizeElevenLabs(text: string): Promise<Buffer | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;

  const cleaned = cleanTextForTTS(text);
  if (!cleaned || cleaned.length < 2) return null;

  // Alice (clear, empathetic female voice, works across tiers)
  const voiceId = process.env.ELEVENLABS_VOICE_ID || "Xb7hH8MSUJpSbSDYk0k2";
  const modelId = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: cleaned.slice(0, 1000), // safe char limit for rapid voice response
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      logger.info({ bytes: arrayBuffer.byteLength }, "ElevenLabs voiceover synthesized successfully");
      return Buffer.from(arrayBuffer);
    } else {
      const errText = await res.text().catch(() => "");
      logger.warn({ status: res.status, errText: errText.slice(0, 150) }, "ElevenLabs API error");
    }
  } catch (err: unknown) {
    logger.warn({ err }, "ElevenLabs synthesis failed");
  }

  return null;
}

/**
 * Offline / local system TTS fallback using macOS `say` + `ffmpeg`.
 */
export async function synthesizeOfflineSystemTTS(text: string, locale = "en"): Promise<Buffer | null> {
  const cleaned = cleanTextForTTS(text);
  if (!cleaned) return null;

  // Voice selection for macOS say
  const voiceMap: Record<string, string> = {
    hi: "Lekha",
    te: "Geeta",
    en: "Aman",
    ar: "Maged",
    ta: "Vani",
    kn: "Soumya",
    bn: "Piya",
  };

  const voice = voiceMap[locale] || "Aman";
  const id = randomUUID();
  const aiffPath = join(tmpdir(), `tts-${id}.aiff`);
  const mp3Path = join(tmpdir(), `tts-${id}.mp3`);

  try {
    await execFileAsync("say", ["-v", voice, cleaned.slice(0, 500), "-o", aiffPath]);
    await execFileAsync("ffmpeg", ["-i", aiffPath, "-y", "-codec:a", "libmp3lame", "-b:a", "64k", mp3Path]);
    const mp3Buffer = await readFile(mp3Path);

    await unlink(aiffPath).catch(() => {});
    await unlink(mp3Path).catch(() => {});

    return mp3Buffer;
  } catch {
    await unlink(aiffPath).catch(() => {});
    await unlink(mp3Path).catch(() => {});
    return null;
  }
}

/**
 * Universal Text-to-Speech synthesizer.
 * Fallback order:
 * 1. ElevenLabs Multilingual v2
 * 2. System / Offline TTS (macOS say + ffmpeg)
 */
export async function synthesizeVoiceReply(
  text: string,
  locale = "en"
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  // 1. ElevenLabs
  const elevenBuffer = await synthesizeElevenLabs(text);
  if (elevenBuffer) {
    return { buffer: elevenBuffer, mimeType: "audio/mpeg" };
  }

  // 2. Offline system fallback
  const sysBuffer = await synthesizeOfflineSystemTTS(text, locale);
  if (sysBuffer) {
    return { buffer: sysBuffer, mimeType: "audio/mpeg" };
  }

  return null;
}
