import { Router, type IRouter } from "express";
import { Buffer } from "node:buffer";
import { rateLimit } from "../lib/rate-limit";
import { logger } from "../lib/logger";
import { fetchConditions, type ConditionsSnapshot } from "../lib/conditions";
import {
  isEmergency,
  emergencyReply,
  buildSystemPrompt,
  runCopilotOnce,
  type CopilotMessage,
} from "../lib/copilot";
import {
  transcribeAndTranslateVoice,
  synthesizeVoiceReply,
  cleanTextForTTS,
  detectLanguageFromText,
  translateToEnglish,
  LANGUAGE_META,
} from "../lib/voice";

const router: IRouter = Router();
const voiceLimiter = rateLimit({ scope: "voice", max: 30, windowMs: 60 * 60 * 1000 });

interface VoiceChatRequest {
  audioBase64?: string;
  mimeType?: string;
  clientTranscript?: string;
  locale?: string;
  location?: { lat: number; lon: number; city?: string | null; country?: string | null };
  profile?: { audience?: string | null; childAgeMonths?: number | null; pregnant?: boolean };
  sessionId?: string;
  history?: CopilotMessage[];
}

/**
 * Direct LLM caller with Ollama / MedGemma fallback
 */
async function generateResponse(opts: {
  systemPrompt: string;
  history: CopilotMessage[];
  userMessage: string;
  locale: string;
}): Promise<string> {
  const { systemPrompt, history, userMessage, locale } = opts;

  // 1. Try runCopilotOnce (if OpenAI integration is provisioned)
  try {
    const reply = await runCopilotOnce({
      locale,
      audience: null,
      conditions: null,
      history,
      userMessage,
      channel: "web",
    });
    if (reply) return reply;
  } catch (err: unknown) {
    logger.info({ err: (err as Error)?.message }, "runCopilotOnce unavailable, using local LLM");
  }

  // 2. Direct Ollama / MedGemma fallback
  const ollamaUrl = process.env.MEDGEMMA_API_URL || process.env.DAYLI_OLLAMA_URL || "http://127.0.0.1:11434";
  const model = process.env.MEDGEMMA_MODEL || "medgemma:latest";

  try {
    const res = await fetch(`${ollamaUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: userMessage },
        ],
        temperature: 0.2,
        max_tokens: 1000,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (text) return text;
    }
  } catch (err: unknown) {
    logger.warn({ err }, "Local Ollama response generation failed");
  }

  // 3. Empathetic default response in user's language
  const defaultReplies: Record<string, string> = {
    te: "నమస్కారం, మీ ప్రశ్నను మేము విన్నాము. మీ బిడ్డకు పాలు లేదా ఫార్ములా ఎక్కువగా ఇవ్వండి. జ్వరం లేదా డీహైడ్రేషన్ లక్షణాలు కనిపిస్తే వెంటనే సమీప ఆసుపత్రికి వెళ్ళండి.",
    hi: "नमस्ते, हमने आपका संदेश सुन लिया है। बच्चे को केवल स्तनपान या आवश्यक तरल दें। यदि बुखार बना रहे तो नजदीकी स्वास्थ्य केंद्र जाएं।",
    ar: "مرحبًا، لقد استمعنا إلى رسالتكم. يرجى التأكد من ترطيب الطفل جيدًا بحليب الأم، ومراجعة الطبيب في حال استمرار الحمى.",
    en: "Thank you for reaching out. Please ensure good hydration (breastmilk or formula for infants). If symptoms persist or worsen, consult a healthcare provider promptly.",
  };

  return defaultReplies[locale] || defaultReplies.en;
}

/**
 * POST /api/chat/voice
 * Handles:
 * 1. Audio ingestion
 * 2. Multilingual speech recognition in user's native tongue
 * 3. Conversion / translation to English for reasoning
 * 4. Clinical copilot response in user's spoken language
 * 5. Text-to-speech voiceover generation
 */
router.post("/chat/voice", voiceLimiter, async (req, res) => {
  try {
    const body = req.body as VoiceChatRequest;
    const {
      audioBase64,
      mimeType,
      clientTranscript,
      locale: clientLocale = "en",
      location,
      profile,
      history = [],
    } = body;

    let audioBuffer: Buffer | undefined;
    if (audioBase64) {
      const cleanB64 = audioBase64.replace(/^data:audio\/[^;]+;base64,/, "");
      audioBuffer = Buffer.from(cleanB64, "base64");
    }

    // Step 1: Multilingual Speech-to-Text & Translation to English
    const recognition = await transcribeAndTranslateVoice({
      audioBuffer,
      mimeType,
      clientTranscript,
      localeHint: clientLocale,
    });

    const { originalTranscript, englishTranscript, detectedLanguage, languageName } = recognition;
    logger.info(
      {
        detectedLanguage,
        languageName,
        originalLen: originalTranscript.length,
        englishLen: englishTranscript.length,
      },
      "Voice message processed & translated to English",
    );

    // Step 2: Emergency detection (check both English and original transcript)
    const isEmerg = isEmergency(englishTranscript) || isEmergency(originalTranscript);
    if (isEmerg) {
      const emergText = emergencyReply(detectedLanguage);
      const voiceReply = await synthesizeVoiceReply(emergText, detectedLanguage);

      res.json({
        originalTranscript,
        englishTranscript,
        detectedLanguage,
        languageName,
        replyText: emergText,
        audioBase64: voiceReply ? `data:${voiceReply.mimeType};base64,${voiceReply.buffer.toString("base64")}` : null,
        audioMimeType: voiceReply?.mimeType || null,
        conditions: null,
        safety: {
          riskLevel: "emergency",
          isEmergency: true,
        },
      });
      return;
    }

    // Step 3: Fetch conditions if coordinates available
    let conditions: ConditionsSnapshot | null = null;
    if (location?.lat && location?.lon) {
      try {
        conditions = await fetchConditions(
          location.lat,
          location.lon,
          location.city ?? null,
          location.country ?? null,
        );
      } catch (err) {
        logger.warn({ err }, "conditions lookup failed in voice chat");
      }
    }

    // Step 4: Construct system prompt tailored to user's language & health context
    const systemPrompt = buildSystemPrompt({
      locale: detectedLanguage,
      conditions,
      audience: profile?.audience ?? null,
      channel: "web",
    });

    // Provide dynamic instruction to reply directly in the user's spoken tongue
    const augmentedSystemPrompt = `${systemPrompt}

[CRITICAL VOICE CONVERSATION INSTRUCTION]:
- The user spoke in ${languageName} (${detectedLanguage}).
- You MUST answer completely and naturally in ${languageName}.
- Keep sentences concise, conversational, and warm — this reply will be read aloud as a voice message.
- Strictly adhere to maternal and pediatric clinical guidelines (e.g. for babies under 6 months, NO plain water, breastmilk or formula only).
`;

    // Step 5: Generate copilot clinical & climate response
    const replyText = await generateResponse({
      systemPrompt: augmentedSystemPrompt,
      history,
      userMessage: englishTranscript, // English inquiry for clinical accuracy
      locale: detectedLanguage,
    });

    // Step 6: Convert response into voice message using voiceover (ElevenLabs / TTS)
    const voiceReply = await synthesizeVoiceReply(replyText, detectedLanguage);

    res.json({
      originalTranscript,
      englishTranscript,
      detectedLanguage,
      languageName,
      replyText,
      audioBase64: voiceReply ? `data:${voiceReply.mimeType};base64,${voiceReply.buffer.toString("base64")}` : null,
      audioMimeType: voiceReply?.mimeType || null,
      conditions,
      safety: {
        riskLevel: "low",
        isEmergency: false,
      },
    });
  } catch (err: unknown) {
    logger.error({ err }, "Voice processing route failed");
    res.status(500).json({
      error: "voice_processing_failed",
      message: "An error occurred while processing the voice message. Please try again or type your question.",
    });
  }
});

/**
 * POST /api/voice/tts
 * Standalone Text-to-Speech endpoint: allows users to listen to any text message
 */
router.post("/voice/tts", voiceLimiter, async (req, res) => {
  try {
    const { text, locale = "en" } = req.body as { text?: string; locale?: string };
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "missing_text", message: "Text parameter is required." });
      return;
    }

    const detected = detectLanguageFromText(text, locale);
    const audio = await synthesizeVoiceReply(text, detected.code);

    if (!audio) {
      res.status(503).json({ error: "tts_unavailable", message: "Voice generation currently unavailable." });
      return;
    }

    res.json({
      audioBase64: `data:${audio.mimeType};base64,${audio.buffer.toString("base64")}`,
      mimeType: audio.mimeType,
      locale: detected.code,
    });
  } catch (err: unknown) {
    logger.error({ err }, "TTS generation failed");
    res.status(500).json({ error: "tts_failed", message: "Failed to generate speech." });
  }
});

export default router;
