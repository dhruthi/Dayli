import { Router, type IRouter } from "express";
import { StreamChatBody as ChatBodySchema } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db, chatTurnsTable } from "@workspace/db";
import { fetchConditions, type ConditionsSnapshot } from "../lib/conditions";
import { rateLimit, getClientIp } from "../lib/rate-limit";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const chatLimiter = rateLimit({ scope: "chat", max: 10, windowMs: 60 * 60 * 1000 });

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi (हिंदी)",
  te: "Telugu (తెలుగు)",
  ar: "Arabic (العربية)",
};

const EMERGENCY_PATTERNS = [
  /chest pain/i,
  /can(?:'?| no)t breathe/i,
  /not breathing/i,
  /unconscious/i,
  /seizure/i,
  /convulsion/i,
  /stroke/i,
  /heart attack/i,
  /heavy bleeding/i,
  /hemorrhag/i,
  /haemorrhag/i,
  /suicide/i,
  /kill myself/i,
  /overdose/i,
  /poisoning/i,
  /baby (?:not breathing|turning blue|limp)/i,
  /child (?:not breathing|turning blue|limp)/i,
];

function emergencyReply(locale: string): string {
  const messages: Record<string, string> = {
    en: "I'm worried this could be a medical emergency. Please contact your local emergency services or go to the nearest hospital right now. dayli is a guidance tool, not an emergency service.",
    hi: "यह एक मेडिकल इमरजेंसी हो सकती है। कृपया तुरंत अपनी स्थानीय आपातकालीन सेवा से संपर्क करें या निकटतम अस्पताल जाएं। dayli एक मार्गदर्शन उपकरण है, आपातकालीन सेवा नहीं।",
    te: "ఇది వైద్య అత్యవసర పరిస్థితి కావచ్చు. దయచేసి వెంటనే మీ స్థానిక అత్యవసర సేవలను సంప్రదించండి లేదా సమీప ఆసుపత్రికి వెళ్లండి. dayli ఒక మార్గదర్శక సాధనం, అత్యవసర సేవ కాదు.",
    ar: "أخشى أن تكون هذه حالة طبية طارئة. يرجى الاتصال بخدمات الطوارئ المحلية أو التوجه إلى أقرب مستشفى الآن. dayli أداة إرشادية وليست خدمة طوارئ.",
  };
  return messages[locale] ?? messages.en;
}

function buildSystemPrompt(opts: {
  locale: string;
  conditions: ConditionsSnapshot | null;
  audience: string | null;
}): string {
  const language = LANGUAGE_NAMES[opts.locale] ?? "English";
  const audienceLine =
    opts.audience && opts.audience !== "general"
      ? `The user is a ${opts.audience} (or asking on behalf of one). Tailor advice accordingly.`
      : "Tailor advice for women and children's daily climate-health needs.";

  const conditionsBlock = opts.conditions
    ? [
        "REAL-TIME LOCAL CONDITIONS (use these to personalise the answer; do not invent other numbers):",
        opts.conditions.summary,
        opts.conditions.tempC != null ? `- Temperature: ${opts.conditions.tempC}°C` : null,
        opts.conditions.feelsLikeC != null ? `- Feels like: ${opts.conditions.feelsLikeC}°C` : null,
        opts.conditions.humidity != null ? `- Humidity: ${opts.conditions.humidity}%` : null,
        opts.conditions.aqiUs != null ? `- US AQI: ${opts.conditions.aqiUs}` : null,
        opts.conditions.uvIndex != null ? `- UV index: ${opts.conditions.uvIndex}` : null,
        `- Heat risk classification: ${opts.conditions.heatRisk}`,
        `- Air quality classification: ${opts.conditions.airRisk}`,
      ]
        .filter(Boolean)
        .join("\n")
    : "No real-time conditions are available; ask the user for their city or be general about climate context.";

  return [
    "You are dayli, an AI Climate Health Copilot for women and children, talking to a visitor on dayli.ai's homepage demo. dayli is a daily decision layer for health in a changing climate — not a chatbot, not a wellness app, not a medical device.",
    "",
    "Your job: combine the user's message with REAL local climate / air conditions to give specific, calm, practical guidance about heat exposure, hydration, air quality, common pregnancy and infant-care concerns, and when to escalate to a clinician.",
    "",
    audienceLine,
    "",
    conditionsBlock,
    "",
    "STYLE RULES:",
    `- ALWAYS reply in ${language}. Even if the user writes in another language, reply in ${language}.`,
    "- Be warm, calm and concrete. No emojis.",
    "- Use short paragraphs and at most 5 bullet points.",
    "- Reference the local conditions when they are relevant (e.g. 'with feels-like 41°C today...').",
    "- End with a one-line safety note: this is general guidance, not a diagnosis, and to contact local medical services for emergencies.",
    "",
    "SAFETY RULES:",
    "- You are NOT a medical device and you do NOT diagnose. Never claim certainty about medical conditions.",
    "- For any symptom that could be an emergency (severe chest pain, breathing trouble, loss of consciousness, heavy bleeding, seizures, stroke signs, suicidal thoughts, baby/child not breathing or turning blue), tell the user to seek emergency care immediately and stop offering home-care suggestions.",
    "- Do not recommend specific prescription medications or doses. You may mention common over-the-counter categories (oral rehydration salts, paracetamol for fever in age-appropriate doses, etc.) only with a 'check with your clinician' caveat.",
    "- Do not invent climate, weather, or AQI numbers. Use only the values provided above.",
  ].join("\n");
}

router.post("/chat", chatLimiter, async (req, res) => {
  const parsed = ChatBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "invalid_body",
      message: parsed.error.issues[0]?.message ?? "Invalid chat body.",
    });
    return;
  }

  const { messages, locale, location, profile, sessionId } = parsed.data;
  const lastUser = [...messages].reverse().find((m) => m.role === "user");

  // Set up SSE response
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const send = (payload: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  // Emergency short-circuit — never send to the model.
  if (lastUser && EMERGENCY_PATTERNS.some((re) => re.test(lastUser.content))) {
    const reply = emergencyReply(locale);
    send({ content: reply });
    send({ done: true, emergency: true });
    res.end();
    return;
  }

  let conditions: ConditionsSnapshot | null = null;
  if (location) {
    try {
      conditions = await fetchConditions(location.lat, location.lon, location.city ?? null, location.country ?? null);
    } catch (err) {
      logger.warn({ err }, "conditions lookup failed inside chat; continuing without");
    }
  }

  const system = buildSystemPrompt({
    locale,
    conditions,
    audience: profile?.audience ?? null,
  });

  let assistantText = "";
  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 2000,
      reasoning_effort: "minimal",
      stream: true,
      messages: [
        { role: "system", content: system },
        ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
    });

    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        assistantText += content;
        send({ content });
      }
    }

    send({ done: true });
    res.end();
  } catch (err) {
    logger.error({ err }, "openai chat stream failed");
    send({
      error: "model_error",
      message: "The copilot is unavailable right now. Please try again in a moment.",
    });
    res.end();
    return;
  }

  // Best-effort persistence — never block the response on the DB write.
  if (lastUser && assistantText) {
    db.insert(chatTurnsTable)
      .values({
        sessionId: sessionId ?? "anon",
        ipAddress: getClientIp(req),
        locale,
        question: lastUser.content,
        answer: assistantText,
        conditions: conditions ?? null,
      })
      .catch((err: unknown) => {
        logger.warn({ err }, "chat_turns persist failed");
      });
  }
});

export default router;
