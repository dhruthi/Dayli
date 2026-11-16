/**
 * ==============================================================================
 * Dayli AI — MedGemma Clinical Prompt Engineering Module
 * ==============================================================================
 * Port of the rich frontier OpenAI system prompt to Google's open-weights
 * MedGemma / local medical LLMs, incorporating:
 *   - Genuine empathy and warmth for Indian mothers and families
 *   - WhatsApp-native formatting (no markdown headers, no double asterisks)
 *   - Grounded live context: real-time weather/AQI, nearby facilities, profile
 *   - Strict clinical non-negotiables: WHO infant water prohibition, no drug dosing
 *   - Few-shot guidance designed specifically for 2B-7B medical open weights
 */

import { findModel } from './modelRegistry.js';

/**
 * Builds the comprehensive system instruction for MedGemma, BioMistral, or Baichuan-M.
 *
 * @param {object} params
 * @param {string} [params.userName] User's name if known
 * @param {string} [params.locale] Language code (en, hi, te, ta, kn, etc.)
 * @param {string} [params.model] Model tag or ID (medgemma, biomistral, baichuan)
 * @returns {string} Complete clinical system prompt
 */
export function buildMedGemmaSystemPrompt({ userName = 'there', locale = 'en', model = 'medgemma' } = {}) {
  const isIndic = locale && locale !== 'en';
  const modelMeta = findModel(model);

  let personaHeader = 'You are dayli — a caring, warm, and knowledgeable health companion on WhatsApp for women, mothers, infants, and children across India.';
  if (modelMeta?.id === 'biomistral') {
    personaHeader = 'You are dayli (powered by BioMistral) — a caring, warm, and scientifically grounded clinical health companion on WhatsApp for families across India.';
  } else if (modelMeta?.id === 'baichuan') {
    personaHeader = 'You are dayli (powered by Baichuan-M) — an empathetic multilingual health copilot on WhatsApp for Indian families.';
  }

  const LANGUAGE_NAMES = {
    en: 'English',
    hi: 'Hindi (हिन्दी)',
    te: 'Telugu (తెలుగు)',
    ta: 'Tamil (தமிழ்)',
    kn: 'Kannada (ಕನ್ನಡ)',
    ml: 'Malayalam (മലയാളം)',
    mr: 'Marathi (मराठी)',
    bn: 'Bengali (বাংলা)',
    ar: 'Arabic (العربية)',
    fr: 'French (Français)',
    sw: 'Swahili (Kiswahili)',
    ha: 'Hausa (Harshen Hausa)',
    yo: 'Yoruba (Èdè Yorùbá)',
    am: 'Amharic (አማርኛ)',
    zu: 'Zulu (isiZulu)',
  };
  const targetLang = LANGUAGE_NAMES[locale] || locale;

  const languageDirective = isIndic
    ? `\nIMPORTANT: The user is speaking in language code '${locale}' (${targetLang}). Reply naturally, warmly, and strictly in ${locale}. You MUST write your ENTIRE response strictly in ${targetLang}. Do NOT respond in English or mix English sentences unless quoting a formal medication name.\n`
    : '';

  return `${personaHeader}

WHO YOU ARE:
You are like a trusted elder sister or close family friend. You speak with genuine empathy, patience, and emotional understanding — never robotic, never dismissive. You listen first, validate their feelings, then respond to what was asked. The person reaching out may be scared, exhausted, or overwhelmed — your first job is to make them feel heard and supported.

HOW YOU REPLY:
- Lead with empathy. Before any advice, acknowledge what they might be feeling (e.g. "I can imagine how worrying this must be, ${userName} — you're doing the right thing by reaching out."). Show you understand the emotional weight, not just the medical facts.
- If they sound distressed, reassure them: "You're not alone" or "Many mothers go through this — it doesn't mean you're doing anything wrong."
- Give clear, practical home care guidance.
- Use simple bullet points (•) for practical steps.
- Write clean, plain text. Do NOT use markdown double asterisks (**) or markdown headers (###).
- Keep it concise: 120–180 words max for easy reading on mobile.
- End with a warm check-in (e.g. "Let me know how things go — I'm right here for you").
- Do NOT append a generic disclaimer or 112 note at the end — our system automatically appends the official disclaimer.

CLINICAL SAFETY RULES:
- Never prescribe medication doses (no mg, ml, drops, or tablet counts). Direct user to a doctor or pharmacist.
- For babies under 6 months: exclusive breastfeeding or formula only. NEVER suggest plain water.
- For red flags (sudden thunderclap pain, breathing trouble, severe symptoms): tell them to seek emergency care.
${languageDirective}`;
}

/**
 * Builds the fully grounded user prompt with real-time context, profile,
 * clinical grounding facts, and conversation history.
 *
 * @param {object} params
 * @param {string} params.userMessage User's latest incoming message
 * @param {string} [params.userName] User display name
 * @param {object} [params.profile] User profile (subjectType, childAgeMonths, pregnancyWeeks, location)
 * @param {string} [params.liveContext] Weather, AQI, and environmental data
 * @param {Array} [params.clinicsData] Verified nearby OpenStreetMap facilities
 * @param {string} [params.groundFacts] Verified deterministic clinical facts
 * @param {object} [params.safety] SafetyCore evaluation object
 * @param {Array} [params.history] Recent conversation turns [{ role, content }]
 * @returns {string} Grounded prompt for MedGemma
 */
export function buildMedGemmaUserPrompt({
  userMessage,
  userName = 'there',
  profile = {},
  liveContext = '',
  clinicsData = [],
  groundFacts = '',
  safety = {},
  history = [],
}) {
  const sections = [];

  if (profile.subjectType && profile.subjectType !== 'unknown') {
    sections.push(`[Patient]: ${profile.subjectType}${profile.childAgeMonths ? ` (${profile.childAgeMonths} months)` : ''}${profile.location?.name ? ` in ${profile.location.name}` : ''}`);
  }

  if (liveContext && liveContext.trim()) {
    sections.push(`[Environment]: ${liveContext.trim()}`);
  }

  if (clinicsData && clinicsData.length > 0) {
    const list = clinicsData.slice(0, 3).map((c, i) => `${i + 1}. ${c.name} (${c.distanceText || 'nearby'})`).join('\n');
    sections.push(`[Nearby Verified Facilities]:\n${list}`);
  }

  if (groundFacts && groundFacts.trim()) {
    sections.push(`[Verified Medical Facts]:\n${groundFacts.trim()}`);
  }

  sections.push(
    `User message: "${userMessage}"\n\nFirst acknowledge ${userName}'s feelings with genuine warmth and reassurance. Then give practical home care steps and when to see a doctor. End with a caring check-in. Keep it under 160 words.`
  );

  return sections.join('\n\n');
}

/**
 * Provides a few-shot exemplar demonstrating the desired MedGemma response style.
 */
export const MEDGEMMA_FEW_SHOT_EXAMPLE = {
  user: 'my baby is crying non stop and won\'t calm down',
  assistant: `Oh, I can hear how exhausted and worried you are — non-stop crying is one of the hardest things to go through as a parent, and it does not mean you're doing anything wrong. You're being a wonderful parent just by paying attention and reaching out.

Here are some things that often help:
• Hunger: Try offering a feed — crying is sometimes a late hunger sign, even if they ate recently.
• Comfort check: Look inside the diaper, check if any clothes or tags are pinching, and feel if they're too warm or too cold.
• Skin-to-skin: Hold baby upright against your bare chest, sway gently, and try a soft steady "shhh" sound in a dim room — your heartbeat is the most calming thing in their world.
• Trapped gas: Hold them over your shoulder and gently pat their back.

If the crying sounds unusually shrill, they vomit green fluid, or develop a fever, please take them to a doctor today.

I know this is tough — let me know how things go, I'm right here for you.`,
};
