/**
 * lib/auroraRiskBrief.js
 *
 * Generates a personalised proactive health risk brief using:
 *   - 24-hour Aurora-style forecast from lib/forecast.js
 *   - Patient profile from the session (subjectType, locale, childAgeMonths)
 *   - Gemini 2.0 Flash for language-aware synthesis
 *
 * Called by:
 *   1. The risk-pulse scheduler (proactive WhatsApp alert)
 *   2. generateAIResponse() when a location-based question is asked
 */

import { findNearestReadyLabourRoom } from './labourRooms.js';
import { allowFrontier } from './coreMode.js';

const DEFAULT_BRIEF_MODEL = 'gemini-2.0-flash';
const BRIEF_TIMEOUT_MS = parseInt(process.env.BRIEF_TIMEOUT_MS || '12000', 10);

const SUBJECT_LABELS = {
  infant: 'an infant under 12 months',
  child: 'a young child',
  pregnant_person: 'a pregnant mother',
  adult: 'an adult',
};

/**
 * Deterministic fallback composer for local Human-Scale AI mode.
 */
export function composeDeterministicRiskBrief({ forecast, profile = {}, cityName = '' }) {
  if (!forecast) return null;
  const locale = profile?.locale || 'en';
  const where = cityName ? `📍 ${cityName}` : '📍 Hyderabad Region';
  const heatLevel = forecast.risk?.heatLevel || 'moderate';
  const aqiLevel = forecast.risk?.aqiLevel || 'moderate';
  const temp = forecast.peakTemp ?? forecast.currentTemp;
  const isPregnant = profile?.subjectType === 'pregnant_person';

  if (locale === 'te') {
    return (
      `☀️ *డేలీ AI మైక్రోక్లైమేట్ బులెటిన్*\n${where}\n\n` +
      `• *గరిష్ట ఉష్ణోగ్రత:* ${temp ? `${temp}°C` : 'అధికం'}\n` +
      `• *ఎండ తీవ్రత:* ${heatLevel.toUpperCase()} | *గాలి నాణ్యత:* ${aqiLevel}\n\n` +
      (isPregnant
        ? `💡 *గర్భిణీలకు సూచన:* మధ్యాహ్నం 11 నుండి 4 గంటల మధ్య విశ్రాంతి తీసుకోండి. కొబ్బరి నీరు లేదా మజ్జిగ తాగుతూ శరీరాన్ని హైడ్రేట్ చేసుకోండి.`
        : `💡 *సూచన:* నేటి పగటి వేళల్లో తగినంత నీరు తాగుతూ ఎండ నుండి రక్షణ పొందండి.`)
    );
  }
  if (locale === 'hi') {
    return (
      `☀️ *Dayli AI माइक्रोक्लाइमेट बुलेटिन*\n${where}\n\n` +
      `• *अधिकतम तापमान:* ${temp ? `${temp}°C` : 'उच्च'}\n` +
      `• *लू स्तर:* ${heatLevel.toUpperCase()} | *वायु गुणवत्ता:* ${aqiLevel}\n\n` +
      (isPregnant
        ? `💡 *गर्भावस्था सलाह:* दोपहर 11 से 4 बजे के बीच घर के अंदर आराम करें और नारियल पानी या छाछ का सेवन करें।`
        : `💡 *सलाह:* दिनभर पर्याप्त पानी पिएं और दोपहर की कड़ी धूप से बचें।`)
    );
  }
  return (
    `☀️ *Dayli AI Microclimate Alert*\n${where}\n\n` +
    `• *Peak Expected Temp:* ${temp ? `${temp}°C` : 'High'}\n` +
    `• *Heat Risk Level:* ${heatLevel.toUpperCase()} | *Air Quality:* ${aqiLevel}\n\n` +
    (isPregnant
      ? `💡 *Maternal Advisory:* Rest indoors between 11 AM – 4 PM. Stay hydrated with tender coconut water and buttermilk.`
      : `💡 *Advisory:* Maintain continuous hydration and minimize direct sun exposure during peak afternoon hours.`)
  );
}

/**
 * Generate a personalized risk brief from forecast and clinical profile.
 *
 * @param {object} params
 * @param {object} params.forecast - Structured forecast object from fetchAuroraForecast
 * @param {object} [params.profile] - Session profile object (subjectType, locale, childAgeMonths)
 * @param {string} [params.cityName] - Known city or district name
 * @returns {Promise<string|null>} WhatsApp-ready text, or null on failure
 */
export async function generateAuroraRiskBrief({ forecast, profile = {}, cityName = '' }) {
  if (!forecast) return null;

  if (!allowFrontier()) return null;

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return null;

  const model = (process.env.GEMINI_ASR_MODEL || DEFAULT_BRIEF_MODEL).trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const locale = profile?.locale || 'en';
  const subject = SUBJECT_LABELS[profile?.subjectType] || 'a family member';
  const ageMonths = profile?.childAgeMonths ? `(${profile.childAgeMonths} months old)` : '';
  const heatLevel = forecast.risk?.heatLevel || 'normal';
  const aqiLevel = forecast.risk?.aqiLevel || 'good';

  let maternalContext = '';
  if (profile?.subjectType === 'pregnant_person') {
    const lat = profile?.location?.latitude ?? forecast?.coords?.lat ?? 17.385;
    const lon = profile?.location?.longitude ?? forecast?.coords?.lon ?? 78.4867;
    const { nearest } = findNearestReadyLabourRoom(lat, lon);
    maternalContext =
      `Maternal Heat Guidance: Advise electrolyte hydration (tender coconut water, buttermilk, lemon water), strict indoor rest between 11 AM and 4 PM to prevent dehydration-induced uterine contractions, and note that ${nearest ? `${nearest.shortName} (${nearest.distanceKm} km away, ${nearest.readyLabourRooms} Ready Labour Rooms)` : 'the nearest CEmONC maternity hospital'} is on standby if dizziness or contractions occur.\n`;
  }

  const langNote =
    locale === 'te'
      ? 'Respond completely in natural Telugu script.'
      : locale === 'hi'
      ? 'Respond completely in natural Hindi (Devanagari script).'
      : 'Respond in English.';

  const systemPrompt =
    `You are dayli — a caring, warm, and knowledgeable health companion in India for mothers, infants, and pregnant women.\n` +
    `CRITICAL FORMATTING FOR WHATSAPP:\n` +
    `- Do NOT use double asterisks (**) for bold.\n` +
    `- Do NOT use markdown headers (###).\n` +
    `- Write clean, natural plain text with simple bullet points (•).\n` +
    `- Maximum 120 words. Concise, direct, and empathetic.`;

  const userPrompt =
    `${langNote}\n\n` +
    `Location: ${cityName || 'your area'}.\n` +
    `Patient context: The guidance is specifically for ${subject} ${ageMonths}.\n` +
    maternalContext +
    `\n24-hour climate forecast:\n${forecast.summary}\n\n` +
    `Evaluated heat stress: ${heatLevel.toUpperCase()}.\n` +
    `Evaluated air quality: ${aqiLevel.toUpperCase()}.\n\n` +
    `Write a proactive, pre-emptive health brief. Alert the caregiver about what conditions to expect later today and give 2–3 concrete clinical protection actions (hydration, staying indoors during peak hours, ventilation). If the patient is an infant under 6 months, strictly remind them: breastmilk only, NO plain water. End with one warm, reassuring sentence.`;

  const body = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 384,
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BRIEF_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      if (res.status === 401) {
        console.warn(`[auroraRiskBrief] Gemini key unauthenticated (401). Check GEMINI_API_KEY in .env.`);
      } else {
        console.error(`[auroraRiskBrief] Gemini error ${res.status}: ${errText.slice(0, 120)}`);
      }
      return null;
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || null;
  } catch (err) {
    clearTimeout(timer);
    const timedOut = err?.name === 'AbortError';
    console.error(`[auroraRiskBrief] ${timedOut ? 'timeout' : 'error'}: ${err.message}`);
    return null;
  }
}
