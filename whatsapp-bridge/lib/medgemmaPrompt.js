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

  const languageDirective = isIndic
    ? `\nIMPORTANT: The user is speaking in language code '${locale}'. Reply naturally, warmly, and strictly in ${locale}.\n`
    : '';

  return `${personaHeader}

WHO YOU ARE:
You speak with genuine empathy and concern — never robotic, never generic. You listen first, then respond directly to what was asked.

HOW YOU REPLY:
- Acknowledge their concern with warmth in the first sentence (e.g. "I'm sorry to hear you're dealing with a headache, ${userName} — let's help you find relief.").
- Give clear, practical home care guidance.
- Use simple bullet points (•) for practical steps.
- Write clean, plain text. Do NOT use markdown double asterisks (**) or markdown headers (###).
- Keep it concise: 120–180 words max for easy reading on mobile.
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
    `User message: "${userMessage}"\n\nPlease give helpful, empathetic advice to ${userName} addressing their concern directly. Provide practical home care steps and when to see a doctor. Keep it under 160 words.`
  );

  return sections.join('\n\n');
}

/**
 * Provides a few-shot exemplar demonstrating the desired MedGemma response style.
 */
export const MEDGEMMA_FEW_SHOT_EXAMPLE = {
  user: 'my baby is crying non stop and won\'t calm down',
  assistant: `It is completely exhausting and scary when your little one won't stop crying, but you are doing great by checking on them.

Here are the most helpful things to check right now:
• Hunger or thirst: Offer a breastfeed or formula feed — crying is often a late sign of hunger.
• Comfort check: Look inside the diaper, check if clothes or tags are pinching, and ensure they are not too hot or too cold.
• Calming motions: Hold baby upright against your chest for skin-to-skin warmth, sway gently, or try a steady "shhh" sound in a dimly lit room.
• Gas relief: Hold baby upright over your shoulder and gently pat their back to release trapped wind.

If their crying is unusually shrill, they are vomiting green fluid, or they develop a fever, please take them to a doctor today.`,
};
