/**
 * Shared dayli-copilot building blocks: language naming, system prompt
 * construction, deterministic emergency-keyword detection (multilingual)
 * and a non-streaming completion helper. Used by both the streaming
 * `/api/chat` SSE route on the website AND the WhatsApp webhook (which
 * needs a single full-text reply to send back via Meta).
 */
import type { ConditionsSnapshot } from "./conditions";
import { VICINITY_LIMIT_M, type Facility, type FacilityKind, type FacilityLookupStatus } from "./places";
import { logger } from "./logger";

export const SUPPORTED_LOCALES = ["en", "hi", "te", "ar"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi (हिंदी)",
  te: "Telugu (తెలుగు)",
  ar: "Arabic (العربية)",
};

// Deterministic emergency-redirect patterns. We match across the four
// supported locales (en/hi/te/ar) so a user typing in Hindi/Telugu/Arabic
// also gets the safety short-circuit without ever reaching the model.
// `u` flag enables proper Unicode matching for non-Latin scripts.
export const EMERGENCY_PATTERNS: RegExp[] = [
  // English
  /chest pain/iu,
  /can(?:'?| no)t breathe/iu,
  /not breathing/iu,
  /unconscious/iu,
  /seizure/iu,
  /convulsion/iu,
  /stroke/iu,
  /heart attack/iu,
  /heavy bleeding/iu,
  /hemorrhag/iu,
  /haemorrhag/iu,
  /suicide/iu,
  /kill myself/iu,
  /overdose/iu,
  /poisoning/iu,
  /baby (?:not breathing|turning blue|limp)/iu,
  /child (?:not breathing|turning blue|limp)/iu,
  // Hindi (devanagari)
  /सीने में दर्द/u,
  /साँस नहीं/u,
  /सांस नहीं/u,
  /बेहोश/u,
  /दौरा/u,
  /हार्ट अटैक/u,
  /दिल का दौरा/u,
  /खून बहना/u,
  /भारी रक्तस्राव/u,
  /आत्महत्या/u,
  /जहर/u,
  /ओवरडोज/u,
  // Telugu
  /ఛాతీ నొప్పి/u,
  /శ్వాస తీసుకోలేక/u,
  /శ్వాస ఆగిపోయింది/u,
  /అపస్మారక/u,
  /మూర్ఛ/u,
  /గుండెపోటు/u,
  /రక్తస్రావం/u,
  /ఆత్మహత్య/u,
  /విషం/u,
  // Arabic
  /ألم في الصدر/u,
  /لا (?:يستطيع|أستطيع|تستطيع) التنفس/u,
  /لا يتنفس/u,
  /فاقد الوعي/u,
  /غيبوبة/u,
  /نوبة/u,
  /سكتة دماغية/u,
  /نوبة قلبية/u,
  /نزيف حاد/u,
  /انتحار/u,
  /جرعة زائدة/u,
  /تسمم/u,
];

export function isEmergency(text: string): boolean {
  return EMERGENCY_PATTERNS.some((re) => re.test(text));
}

export function emergencyReply(locale: string): string {
  const messages: Record<string, string> = {
    en: "I'm worried this could be a medical emergency. Please contact your local emergency services or go to the nearest hospital right now. dayli is a guidance tool, not an emergency service.",
    hi: "यह एक मेडिकल इमरजेंसी हो सकती है। कृपया तुरंत अपनी स्थानीय आपातकालीन सेवा से संपर्क करें या निकटतम अस्पताल जाएं। dayli एक मार्गदर्शन उपकरण है, आपातकालीन सेवा नहीं।",
    te: "ఇది వైద్య అత్యవసర పరిస్థితి కావచ్చు. దయచేసి వెంటనే మీ స్థానిక అత్యవసర సేవలను సంప్రదించండి లేదా సమీప ఆసుపత్రికి వెళ్లండి. dayli ఒక మార్గదర్శక సాధనం, అత్యవసర సేవ కాదు.",
    ar: "أخشى أن تكون هذه حالة طبية طارئة. يرجى الاتصال بخدمات الطوارئ المحلية أو التوجه إلى أقرب مستشفى الآن. dayli أداة إرشادية وليست خدمة طوارئ.",
  };
  return messages[locale] ?? messages.en;
}

/**
 * India-specific, because the pilot is. 108 is the free 24/7 ambulance line and
 * reaches a caller at their location without them naming any facility, which is
 * exactly what is needed when the directory cannot answer. Change these two
 * numbers if dayli is ever deployed outside India.
 */
const EMERGENCY_NUMBERS =
  "108 (free 24/7 ambulance across India, which reaches them where they are) or 112 (all-purpose emergency number)";

export interface FacilityContext {
  kind: FacilityKind;
  /** `no_location` means we never got as far as a lookup. */
  status: FacilityLookupStatus | "no_location";
  results: Facility[];
}

/**
 * Turn a facility lookup into model instructions.
 *
 * The statuses must never be collapsed. "The directory did not answer" and
 * "nothing is mapped near you" are opposite claims, and only the second is
 * about the user's surroundings — reporting an outage as an absence is the
 * dangerous failure this whole feature guards against. Every degraded branch
 * therefore says what we do and do not know, offers something that works
 * without a facility name, and closes on a question rather than an apology.
 */
function buildFacilitiesBlock(facilities: FacilityContext): string {
  const kindWord = facilities.kind === "pharmacy" ? "pharmacies" : "hospitals or clinics";
  const noInvent =
    "Do NOT name, recall or give an example of any specific facility, its address or its phone number — not even a well-known one. The national numbers named below are the only numbers you may give.";
  const closeOnQuestion =
    "End with exactly ONE short follow-up question, and make it the question that changes what you do next: whether someone is unwell right now, so you can help with the symptoms meanwhile, or whether they are noting this down to have ready later. Never end on the apology, and never close with a generic \"anything else?\".";

  if (facilities.status === "ok" && facilities.results.length > 0) {
    const lines = facilities.results.map((f, i) => {
      const address = f.address ? `\n   Address: ${f.address}` : "";
      return `${i + 1}. ${f.name} (${f.type}) — ${f.distanceText} away${address}\n   Map: ${f.mapsUrl}`;
    });
    const nearest = facilities.results[0];
    const tooFar =
      nearest.distanceMetres > VICINITY_LIMIT_M
        ? `\nNOTHING CLOSE BY: the nearest is ${nearest.distanceText} away, which is not walking distance. Say plainly that nothing is very close and that this is the nearest option, so they can plan how to travel.`
        : "";
    return [
      `NEARBY ${facilities.kind.toUpperCase()} RESULTS (OpenStreetMap, measured from the user's own coordinates, nearest first):`,
      ...lines,
      "List these in the order given — it is nearest-first and the user asked for the nearest. Quote each distance exactly as shown, include the map link for each, and do NOT add, reorder or invent any facility, address or distance. This list is worth the characters: keep every entry and its link even though the channel hint asks for brevity." +
        tooFar,
    ].join("\n");
  }

  if (facilities.status === "unavailable") {
    return [
      `FACILITY DIRECTORY TEMPORARILY DOWN: the live map directory did not answer, so we do NOT know what is near this user. Do not say there are none, and do not suggest their area is unmapped. ${noInvent} Build the reply in this order:`,
      "1. Say plainly that you could not reach the live facility directory just now, and that this is a fault on dayli's side — not a sign that there is nothing near them.",
      "2. Say you would rather not guess at a name or address, because a wrong address costs time they may not have.",
      `3. Give what works right now without any facility name: ${EMERGENCY_NUMBERS}.`,
      "4. Tell them the directory usually recovers within a minute or two and that asking again is all it takes. Do NOT ask for their location: we already have it.",
      `5. ${closeOnQuestion}`,
    ].join("\n");
  }

  if (facilities.status === "empty") {
    return `NONE REGISTERED NEARBY: the directory answered and has no ${kindWord} mapped within 25km of this user. ${noInvent} Say plainly that none are listed near them, and that rural areas are often incompletely mapped, so something unlisted may still be close. Point them at ${EMERGENCY_NUMBERS}, and suggest asking a neighbour or the local ASHA worker, who will know what the map does not. Do NOT ask for their location: we already have it. ${closeOnQuestion}`;
  }

  // "no_location" and "invalid" both mean we could not run a lookup at all.
  return `NO LOCATION KNOWN: we have no usable location for this user, so no lookup ran. ${noInvent} Ask them to share a WhatsApp location pin, or to name their town or area, so you can look up ${kindWord} near them, and say it is used only for this search. If they need help before that, ${EMERGENCY_NUMBERS} reach help without any address. ${closeOnQuestion}`;
}

export function buildSystemPrompt(opts: {
  locale: string;
  conditions: ConditionsSnapshot | null;
  audience: string | null;
  channel?: "web" | "whatsapp";
  /** Present only when the user actually asked for a nearby facility. */
  facilities?: FacilityContext | null;
}): string {
  const language = LANGUAGE_NAMES[opts.locale] ?? "English";
  const audienceLine =
    opts.audience && opts.audience !== "general"
      ? `The user is a ${opts.audience} (or asking on behalf of one). Tailor advice accordingly.`
      : "Tailor advice for women and children's daily climate-health needs.";

  const channelHint =
    opts.channel === "whatsapp"
      ? "You are replying inside WhatsApp. Keep messages short enough to feel natural in a chat thread (ideally under 700 characters). No markdown headings; plain text and short bullet hyphens are fine."
      : "You are replying inside an in-page web chat demo on dayli.ai. Markdown lists are OK.";

  const conditionsBlock = opts.conditions
    ? [
        "REAL-TIME LOCAL CONDITIONS (use these to personalise the answer; do not invent other numbers):",
        opts.conditions.summary,
        opts.conditions.tempC != null ? `- Temperature: ${opts.conditions.tempC}°C` : null,
        opts.conditions.feelsLikeC != null
          ? `- Feels like: ${opts.conditions.feelsLikeC}°C`
          : null,
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
    "You are dayli, an AI Climate Health Copilot for women and children. dayli is a daily decision layer for health in a changing climate — not a chatbot, not a wellness app, not a medical device.",
    "",
    "Your job: combine the user's message with REAL local climate / air conditions to give specific, calm, practical guidance about heat exposure, hydration, air quality, common pregnancy and infant-care concerns, and when to escalate to a clinician.",
    "",
    audienceLine,
    "",
    channelHint,
    "",
    conditionsBlock,
    "",
    // Only present when the user asked where to go; the rest of the time this
    // costs nothing and the model never sees facility instructions at all.
    ...(opts.facilities ? [buildFacilitiesBlock(opts.facilities), ""] : []),
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

export interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
}

type OpenAIClient = typeof import("@workspace/integrations-openai-ai-server").openai;

let openaiPromise: Promise<OpenAIClient> | null = null;

/**
 * Lazily resolve the OpenAI client. The integration package throws at
 * module-load time if `AI_INTEGRATIONS_OPENAI_*` env vars are missing —
 * loading on first request lets the rest of the API stay up if AI envs
 * are ever absent. Failed loads are not cached so a later request can
 * retry once env is fixed.
 */
export function getOpenAI(): Promise<OpenAIClient> {
  if (!openaiPromise) {
    openaiPromise = import("@workspace/integrations-openai-ai-server")
      .then((m) => m.openai)
      .catch((err) => {
        openaiPromise = null;
        throw err;
      });
  }
  return openaiPromise;
}

/**
 * Non-streaming copilot completion. Used by the WhatsApp webhook, which
 * needs a single text body to POST back to Meta. Returns the assistant
 * text or throws on any failure (caller decides what fallback message to
 * send to the user). The streaming variant lives inline in
 * `routes/chat.ts` because SSE chunk handling is route-specific.
 */
export async function runCopilotOnce(opts: {
  locale: string;
  audience: string | null;
  conditions: ConditionsSnapshot | null;
  history: CopilotMessage[];
  userMessage: string;
  channel?: "web" | "whatsapp";
  facilities?: FacilityContext | null;
}): Promise<string> {
  if (isEmergency(opts.userMessage)) {
    return emergencyReply(opts.locale);
  }
  const openai = await getOpenAI();
  const system = buildSystemPrompt({
    locale: opts.locale,
    conditions: opts.conditions,
    audience: opts.audience,
    channel: opts.channel ?? "web",
    facilities: opts.facilities ?? null,
  });
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 1500,
      reasoning_effort: "minimal",
      stream: false,
      messages: [
        { role: "system", content: system },
        ...opts.history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: opts.userMessage },
      ],
    });
    const text = completion.choices?.[0]?.message?.content;
    if (typeof text !== "string" || text.trim().length === 0) {
      throw new Error("empty completion");
    }
    return text.trim();
  } catch (err) {
    logger.error({ err }, "runCopilotOnce failed");
    throw err;
  }
}
