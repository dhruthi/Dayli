import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import 'dotenv/config';
import {
  evaluateSafety,
  composeSafeResponse,
  validateModelOutput,
  SAFETY_RULE_VERSION,
} from '../shared/safetyCore.js';
import { CloudApiClient } from './lib/cloudApi.js';
import { normalizeWebhook, isUnreadableMedia } from './lib/inbound.js';
import { Store } from './lib/store.js';
import * as onboarding from './lib/onboarding.js';
import { getMessageQueue, getReminderQueue, closeQueues } from './lib/queues.js';
import { initWorkers, closeWorkers } from './lib/workers.js';
import { closeRedis } from './lib/redis.js';
import {
  increment as metric,
  observeLatency,
  snapshot as metricsSnapshot,
  readRollups,
  startMetricsFlusher,
  stopMetricsFlusher,
} from './lib/metrics.js';
import { userActivitySnapshot } from './lib/opsStats.js';
import {
  getClimateHealthSnapshot,
  assignUniqueDayliId,
  redactPhi,
  _clearClimateHealthCache,
} from './lib/climateHealthStats.js';
import {
  LOGIN_PAGE_HTML,
  getLoginPageHtml,
  handleLogin,
  handleLogout,
  requireDashboardAuth,
} from './lib/auth.js';
import { GERMAN_PITCH_HTML } from './lib/germanPitch.js';
import {
  findNearestReadyLabourRoom,
  formatLabourRoomWhatsAppBlock,
} from './lib/labourRooms.js';
import { fileURLToPath } from 'node:url';
import { stickerFor } from './lib/stickers.js';
import {
  lookupFacilities,
  reverseGeocode,
  prefetchFacilities,
  detectFacilityKind,
  locationRequestFor,
  VICINITY_LIMIT_M,
} from './lib/places.js';
import {
  startMorningBriefScheduler,
  stopMorningBriefScheduler,
  composeFirstTip,
  composeMorningBrief,
  runMorningBriefs,
  sendMorningBriefToUser,
  isDailyForecastSubscriptionQuery,
} from './lib/morningBrief.js';
import { logger } from './lib/logger.js';
import { transcribeVoice, buildVoiceReply } from './lib/voice.js';
import { hasFfmpeg } from './lib/audioConvert.js';
import { isBhashiniConfigured } from './lib/bhashini.js';
import { fetchAuroraForecast } from './lib/forecast.js';
import { generateAuroraRiskBrief } from './lib/auroraRiskBrief.js';
import { getSimulatedWomenObservatory, SIMULATED_WOMEN_SCENARIOS } from './lib/simChats.js';
import { fetch5DayForecast, isNearHyderabad } from './lib/forecast5d.js';
import { initAuroraFeed, ingestAuroraForecast, auroraStatus, ensureFreshAuroraFeed } from './lib/auroraFeed.js';
import { compose5DayOutlook, composeSimpleWeatherAdvice, compose24HourWeatherChangeAdvice } from './lib/actionAdvisor.js';
import { isWeatherMapQuery, getWeatherMapData, HYDERABAD_DEFAULT } from './lib/weatherMap.js';
import {
  SURVEY_IDS,
  surveyInvitePrompt,
  isSurveyTrigger,
  advanceSurvey,
  sendFeedbackSurveyToUser,
  sendFeedbackSurveyToAllUsers,
} from './lib/survey.js';
import { CORE_MODE, allowFrontier, isLocalOnly, allowLocalLlm } from './lib/coreMode.js';
import { route as routerRoute } from './lib/router/index.js';
import { composeDeterministicResponse } from './lib/responder.js';
import { rewriteWithLocalLlm, generateWithLocalLlm } from './lib/localLlm.js';
import {
  isLanguageCommand,
  parseLanguageSelection,
  getLanguageMenu,
  getLanguageSwitchedMessage,
  normalizeLocale,
  t,
} from './lib/i18n/index.js';
import { handleModelCommand, resolveActiveModel } from './lib/modelRegistry.js';

const app = express();
const PORT = process.env.PORT || 3000;

// A Meta webhook is called server-to-server. Allowing arbitrary browser origins
// on it serves no purpose and widens the attack surface.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map((o) => o.trim()).filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // non-browser caller
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:') || origin.endsWith('dayli.ai') || origin.endsWith('.onrender.com')) {
        return cb(null, true);
      }
      return cb(null, ALLOWED_ORIGINS.includes(origin));
    },
  })
);
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Sticker artwork. Meta fetches these links server-to-server when we send a
// sticker message, so they must be publicly reachable and cacheable.
app.use(
  '/stickers',
  express.static(fileURLToPath(new URL('./public/stickers', import.meta.url)), {
    maxAge: '7d',
    immutable: false,
    fallthrough: false,
  })
);

// Configuration
const VERIFY_TOKEN = process.env.META_WHATSAPP_VERIFY_TOKEN;
const PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const AI_KEY_PRESENT = Boolean(
  process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY || process.env.GROK_API_KEY || process.env.XAI_API_KEY
);
// Canonical name matches .env.example; META_APP_SECRET kept as a legacy alias so an
// existing deployment does not silently drop to unverified on upgrade.
const APP_SECRET = process.env.META_WHATSAPP_APP_SECRET || process.env.META_APP_SECRET;
// Set ALLOW_UNVERIFIED_WEBHOOKS=true ONLY for local development against a tunnel.
const ALLOW_UNVERIFIED_WEBHOOKS = process.env.ALLOW_UNVERIFIED_WEBHOOKS === 'true';

// Strict Environment Verification (Securing the production deployment)
console.log(`[CORE MODE] Running in "${CORE_MODE}" mode (isLocalOnly=${isLocalOnly()}, allowFrontier=${allowFrontier()})`);
if (!VERIFY_TOKEN || !PHONE_NUMBER_ID || !ACCESS_TOKEN || (!isLocalOnly() && !GEMINI_API_KEY && !AI_KEY_PRESENT)) {
  const missing = [];
  if (!VERIFY_TOKEN) missing.push('META_WHATSAPP_VERIFY_TOKEN');
  if (!PHONE_NUMBER_ID) missing.push('META_WHATSAPP_PHONE_NUMBER_ID');
  if (!ACCESS_TOKEN) missing.push('META_WHATSAPP_ACCESS_TOKEN');
  if (!isLocalOnly() && !GEMINI_API_KEY && !AI_KEY_PRESENT) missing.push('OPENAI_API_KEY (or GEMINI_API_KEY) [bypass with DAYLI_CORE_MODE=local]');
  
  console.error(`❌ [STARTUP ERROR] Missing required environment variables: ${missing.join(', ')}`);
  console.error('Please configure these in your Render dashboard or .env file before starting the application.');
  process.exit(1);
}

if (!APP_SECRET && !ALLOW_UNVERIFIED_WEBHOOKS) {
  console.error(
    '❌ [STARTUP ERROR] META_WHATSAPP_APP_SECRET is not set. Inbound webhooks cannot be\n' +
    '   authenticated, and an unauthenticated webhook lets anyone put a phone number in\n' +
    '   the request body and have this service send a WhatsApp message to it.\n' +
    '   Set META_WHATSAPP_APP_SECRET, or set ALLOW_UNVERIFIED_WEBHOOKS=true for local dev only.'
  );
  process.exit(1);
}
if (!APP_SECRET) {
  console.warn('⚠️  [SECURITY] Running with webhook signature verification DISABLED (dev override).');
}

// =================================================================
// 0. RUNTIME SERVICES
// =================================================================

const cloudApi = new CloudApiClient({
  accessToken: ACCESS_TOKEN,
  phoneNumberId: PHONE_NUMBER_ID,
});

/** Replaced at startup by Store.create(). */
let store = null;

// =================================================================
// 0a. RATE LIMITING
// =================================================================

/**
 * Per-sender and global caps. Without these, one forged or looping caller can
 * drive unbounded model spend and unbounded Graph API sends on a metered,
 * quality-rated number. In-process only — move to Redis before multi-instance.
 */
const RATE_WINDOW_MS = 60 * 1000;
const MAX_PER_SENDER_PER_MIN = parseInt(process.env.RATE_LIMIT_PER_SENDER || '12', 10);
const MAX_GLOBAL_PER_MIN = parseInt(process.env.RATE_LIMIT_GLOBAL || '300', 10);
const senderHits = new Map();
let globalHits = [];

function isRateLimited(senderId) {
  const now = Date.now();
  globalHits = globalHits.filter((t) => now - t < RATE_WINDOW_MS);
  if (globalHits.length >= MAX_GLOBAL_PER_MIN) return 'global';
  const hits = (senderHits.get(senderId) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= MAX_PER_SENDER_PER_MIN) {
    senderHits.set(senderId, hits);
    return 'sender';
  }
  hits.push(now);
  senderHits.set(senderId, hits);
  globalHits.push(now);
  if (senderHits.size > 10000) {
    for (const [id, ts] of senderHits) {
      if (!ts.length || now - ts[ts.length - 1] > RATE_WINDOW_MS * 10) senderHits.delete(id);
    }
  }
  return null;
}

// =================================================================
// 0. PRIVACY & DELIVERY HELPERS
// =================================================================

/**
 * Stable, non-reversible tag for a phone number, so logs stay correlatable
 * without storing an identifier. Salted with the app secret where available.
 */
const LOG_SALT = APP_SECRET || VERIFY_TOKEN || 'dayli-log-salt';
function pseudonymize(value) {
  if (!value) return 'anon';
  return 'u_' + crypto.createHmac('sha256', LOG_SALT).update(String(value)).digest('hex').slice(0, 12);
}

// =================================================================
// 1. OPEN-METEO WEATHER & AIR QUALITY INTELLIGENCE (100% Open Data)
// =================================================================

/**
 * Cities we recognise by name in a message. Used both to geocode a query like
 * "hospitals in Bangalore" and to know that such a query is not asking about
 * wherever the user happens to be standing.
 */
const COMMON_CITIES = ['hyderabad', 'bangalore', 'bengaluru', 'mumbai', 'delhi', 'chennai', 'kolkata', 'pune', 'jaipur', 'ahmedabad', 'lucknow', 'chandigarh', 'kochi', 'visakhapatnam', 'vijayawada', 'noida', 'gurgaon', 'patna', 'bhopal', 'indore', 'surat', 'nagpur'];



// Geocode city name to lat/lon via Open-Meteo Geocoding API
async function geocodeLocation(cityName) {
  try {
    const cleanCity = cityName.replace(/[^a-zA-Z\s]/g, '').trim();
    if (!cleanCity || cleanCity.length < 2) return null;
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanCity)}&count=1&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const loc = data.results[0];
      return {
        name: loc.name,
        state: loc.admin1 || '',
        country: loc.country || '',
        latitude: loc.latitude,
        longitude: loc.longitude,
      };
    }
    return null;
  } catch (err) {
    console.error('[GEOCODING ERROR]:', err.message);
    return null;
  }
}

// Fetch live weather & air quality from Open-Meteo
async function fetchClimateIntelligence(lat, lon, cityName = '') {
  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,uv_index,weather_code`;
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,us_aqi`;

    const [wRes, aRes, forecastData] = await Promise.all([
      fetch(weatherUrl),
      fetch(aqiUrl),
      fetchAuroraForecast(lat, lon).catch(() => null),
    ]);

    const weatherData = wRes.ok ? await wRes.json() : null;
    const aqiData = aRes.ok ? await aRes.json() : null;

    const temp = weatherData?.current?.temperature_2m ?? 'N/A';
    const feelsLike = weatherData?.current?.apparent_temperature ?? temp;
    const humidity = weatherData?.current?.relative_humidity_2m ?? 'N/A';
    const uvIndex = weatherData?.current?.uv_index ?? 'N/A';
    const aqi = aqiData?.current?.us_aqi ?? 'N/A';
    const pm25 = aqiData?.current?.pm2_5 ?? 'N/A';
    const pm10 = aqiData?.current?.pm10 ?? 'N/A';

    let heatRisk = 'Normal';
    if (typeof temp === 'number') {
      if (temp >= 42 || feelsLike >= 45) heatRisk = '🚨 EXTREME HEATWAVE DANGER (Stay indoors, danger of heatstroke)';
      else if (temp >= 38 || feelsLike >= 40) heatRisk = '⚠️ HIGH HEAT STRESS (Hydration & rest critical for pregnant women & infants)';
      else if (temp >= 33) heatRisk = '☀️ MODERATE HEAT CAUTION (Limit direct sun exposure between 12-4 PM)';
    }

    let aqiCategory = 'Good';
    if (typeof aqi === 'number') {
      if (aqi > 200) aqiCategory = '🚨 Very Unhealthy / Hazardous (Keep windows closed, wear N95 outdoors)';
      else if (aqi > 150) aqiCategory = '⚠️ Unhealthy for Sensitive Groups (Children & pregnant women avoid exertion)';
      else if (aqi > 100) aqiCategory = 'Moderate / Sensitive Group Warning';
    }

    return {
      cityName: cityName || `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
      latitude: lat,
      longitude: lon,
      temperature: temp,
      feelsLike: feelsLike,
      humidity: humidity,
      uvIndex: uvIndex,
      aqi: aqi,
      pm25: pm25,
      pm10: pm10,
      heatRisk,
      aqiCategory,
      forecast: forecastData,
      summary: `• Location: ${cityName || 'GPS Coordinates'}\n• Current Temperature: ${temp}°C (Feels like: ${feelsLike}°C)\n• Humidity: ${humidity}%\n• UV Index: ${uvIndex} / 11\n• Air Quality (US AQI): ${aqi} (${aqiCategory})\n• PM2.5: ${pm25} µg/m³ | PM10: ${pm10} µg/m³\n• Heat Risk Status: ${heatRisk}`,
    };
  } catch (err) {
    console.error('[CLIMATE FETCH ERROR]:', err.message);
    return null;
  }
}

// =================================================================
// 2. OPENSTREETMAP CLINIC & HOSPITAL FINDER (Location Intelligence)
// =================================================================

// City-level verified hospital fallback data
const TOP_HOSPITALS_BY_CITY = {
  hyderabad: [
    { name: 'Apollo Hospitals, Jubilee Hills', address: 'Road No 72, Film Nagar, Jubilee Hills, Hyderabad', mapsUrl: 'https://maps.google.com/?q=Apollo+Hospitals+Jubilee+Hills+Hyderabad' },
    { name: 'Yashoda Hospitals, Somajiguda', address: 'Raj Bhavan Rd, Matha Nagar, Somajiguda, Hyderabad', mapsUrl: 'https://maps.google.com/?q=Yashoda+Hospitals+Somajiguda+Hyderabad' },
    { name: 'Care Hospitals, Banjara Hills', address: 'Road No 1, Prem Nagar, Banjara Hills, Hyderabad', mapsUrl: 'https://maps.google.com/?q=Care+Hospitals+Banjara+Hills+Hyderabad' },
  ],
  bengaluru: [
    { name: 'Manipal Hospital, Old Airport Road', address: '98, HAL Old Airport Rd, Kodihalli, Bengaluru', mapsUrl: 'https://maps.google.com/?q=Manipal+Hospital+Old+Airport+Road+Bangalore' },
    { name: 'Fortis Hospital, Bannerghatta Road', address: '154/9, Bannerghatta Main Rd, Bengaluru', mapsUrl: 'https://maps.google.com/?q=Fortis+Hospital+Bannerghatta+Road+Bangalore' },
    { name: 'Apollo Hospitals, Jayanagar', address: '21/2, 14th Cross Rd, Jayanagar, Bengaluru', mapsUrl: 'https://maps.google.com/?q=Apollo+Hospitals+Jayanagar+Bangalore' },
  ],
  bangalore: [
    { name: 'Manipal Hospital, Old Airport Road', address: '98, HAL Old Airport Rd, Kodihalli, Bengaluru', mapsUrl: 'https://maps.google.com/?q=Manipal+Hospital+Old+Airport+Road+Bangalore' },
    { name: 'Fortis Hospital, Bannerghatta Road', address: '154/9, Bannerghatta Main Rd, Bengaluru', mapsUrl: 'https://maps.google.com/?q=Fortis+Hospital+Bannerghatta+Road+Bangalore' },
    { name: 'Apollo Hospitals, Jayanagar', address: '21/2, 14th Cross Rd, Jayanagar, Bengaluru', mapsUrl: 'https://maps.google.com/?q=Apollo+Hospitals+Jayanagar+Bangalore' },
  ],
  mumbai: [
    { name: 'Lilavati Hospital & Research Centre', address: 'A-791, Bandra Reclamation, Bandra West, Mumbai', mapsUrl: 'https://maps.google.com/?q=Lilavati+Hospital+Bandra+Mumbai' },
    { name: 'Kokilaben Dhirubhai Ambani Hospital', address: 'Rao Saheb, Achutrao Patwardhan Marg, Four Bungalows, Andheri West, Mumbai', mapsUrl: 'https://maps.google.com/?q=Kokilaben+Hospital+Andheri+Mumbai' },
    { name: 'Hinduja Hospital', address: 'Veer Savarkar Marg, Mahim West, Mumbai', mapsUrl: 'https://maps.google.com/?q=Hinduja+Hospital+Mahim+Mumbai' },
  ],
  delhi: [
    { name: 'AIIMS (All India Institute of Medical Sciences)', address: 'Sri Aurobindo Marg, Ansari Nagar, New Delhi', mapsUrl: 'https://maps.google.com/?q=AIIMS+New+Delhi' },
    { name: 'Max Super Speciality Hospital, Saket', address: '1, 2, Press Enclave Marg, Saket, New Delhi', mapsUrl: 'https://maps.google.com/?q=Max+Hospital+Saket+New+Delhi' },
    { name: 'Fortis Escorts Heart Institute, Okhla', address: 'Okhla Rd, Sukhdev Vihar, New Delhi', mapsUrl: 'https://maps.google.com/?q=Fortis+Escorts+Okhla+New+Delhi' },
  ],
};

/**
 * Find facilities near the user.
 *
 * Location comes from coordinates only. The previous implementation accepted a
 * city *name* and, when the caller handed it the UI placeholder "your
 * location", searched Nominatim worldwide for "hospital in your location" —
 * returning hospitals in Ouarzazate, Morocco to a user in Hyderabad whose real
 * coordinates were sitting unused. A name can never locate anyone here now.
 *
 * @param {number|null} lat
 * @param {number|null} lon
 * @param {string} cityName - Display/fallback only. Never used to search.
 * @param {'hospital'|'pharmacy'} kind
 */
async function findNearbyClinics(lat, lon, cityName = '', kind = 'hospital') {
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    try {
      const { status, results, source } = await lookupFacilities({ lat, lon, kind });
      metric(`facility.${status}`);
      metric(`facility.kind.${kind}`);
      if (source) metric(`facility.source.${source}`);
      if (status === 'ok') return { status, results };
      if (status === 'unavailable') {
        // Only fall through to the curated list if it can actually answer;
        // otherwise report the outage, because "no hospitals near you" is a
        // very different — and dangerous — thing to tell someone.
        const cityKey = (cityName || '').toLowerCase().trim();
        if (kind === 'hospital' && cityKey && TOP_HOSPITALS_BY_CITY[cityKey]) {
          return { status: 'city_list', results: curatedFor(cityKey) };
        }
        return { status: 'unavailable', results: [] };
      }
      // status === 'empty': the directory answered and there is nothing here.
      const cityKey = (cityName || '').toLowerCase().trim();
      if (kind === 'hospital' && cityKey && TOP_HOSPITALS_BY_CITY[cityKey]) {
        return { status: 'city_list', results: curatedFor(cityKey) };
      }
      return { status: 'empty', results: [] };
    } catch (err) {
      console.error('[CLINIC FINDER ERROR]:', err.message);
      metric('facility.error');
      return { status: 'unavailable', results: [] };
    }
  }

  // No usable coordinates. The curated list is a last resort and only for a
  // city we actually recognise: handing someone the default city's hospitals
  // when they are somewhere else can send them to the wrong place.
  const cityKey = (cityName || '').toLowerCase().trim();
  if (kind === 'hospital' && cityKey && TOP_HOSPITALS_BY_CITY[cityKey]) {
    return { status: 'city_list', results: curatedFor(cityKey) };
  }
  console.warn(`[CLINIC FINDER] no location for kind=${kind} city="${cityKey || 'unknown'}"`);
  return { status: 'no_location', results: [] };
}

/** Curated entries carry no measured distance — they are city-level, not from the user. */
function curatedFor(cityKey) {
  return TOP_HOSPITALS_BY_CITY[cityKey].map((h) => ({ ...h, type: 'Hospital' }));
}

// =================================================================
// 3. GROK & GROQ AI-POWERED ENGINE (Primary) & GEMINI (Fallback)
// =================================================================
/**
 * Primary inference provider. The lookup order is:
 *   1. GROQ_API_KEY — currently the active, working provider
 *   2. OPENAI_API_KEY — only if it looks like a valid key (starts with sk-)
 *   3. GROK_API_KEY / XAI_API_KEY — xAI/Grok
 *
 * Previously OPENAI_API_KEY was checked first, which meant a stale/invalid
 * OpenAI key on Render silently hijacked the provider chain and caused
 * every AI call to fail. The new order prevents this permanently.
 */
function pickAiKey() {
  const openai = (process.env.OPENAI_API_KEY || '').trim();
  const groq = (process.env.GROQ_API_KEY || '').trim();
  const grok = (process.env.GROK_API_KEY || '').trim();
  const xai = (process.env.XAI_API_KEY || '').trim();
  const medgemma = (process.env.MEDGEMMA_API_KEY || '').trim();

  // OpenAI keys start with 'sk-' — prioritized for frontier cloud inference
  if (openai && openai.startsWith('sk-')) return openai;
  // Groq keys start with 'gsk_'
  if (groq && groq.startsWith('gsk_')) return groq;
  // xAI keys start with 'xai-'
  if (xai && xai.startsWith('xai-')) return xai;
  if (grok && grok.startsWith('xai-')) return grok;
  if (medgemma && !medgemma.includes('local')) return medgemma;
  return openai || groq || grok || xai || medgemma || '';
}

const AI_API_KEY = pickAiKey();

function resolveAiProvider(key) {
  if (key.startsWith('sk-')) {
    return { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini', label: 'openai' };
  }
  if (key.startsWith('gsk_')) {
    return { url: 'https://api.groq.com/openai/v1/chat/completions', model: 'openai/gpt-oss-120b', label: 'groq' };
  }
  if (key.startsWith('xai-')) {
    return { url: 'https://api.x.ai/v1/chat/completions', model: 'grok-2-latest', label: 'xai' };
  }
  if (key.startsWith('medgemma') || key.startsWith('hf_')) {
    const rawUrl = process.env.MEDGEMMA_API_URL || 'http://127.0.0.1:11434';
    const url = rawUrl.includes('/chat/completions') ? rawUrl : `${rawUrl.replace(/\/+$/, '')}/v1/chat/completions`;
    return {
      url,
      model: process.env.MEDGEMMA_MODEL || 'medgemma:latest',
      label: 'medgemma',
    };
  }
  if (!key) {
    return { url: '', model: '', label: 'none' };
  }
  // Unknown key format — default to OpenAI as best guess
  console.warn(`[AI] Unknown key prefix "${key.slice(0, 6)}..." — defaulting to OpenAI endpoint`);
  return { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini', label: 'openai-guess' };
}

const AI_PROVIDER = resolveAiProvider(AI_API_KEY);
const AI_API_URL = AI_PROVIDER.url;
const AI_MODEL = (process.env.OPENAI_MODEL || '').trim() || AI_PROVIDER.model;
const AI_TIMEOUT_MS = parseInt(process.env.OPENAI_TIMEOUT_MS || '30000', 10);

// Log the resolved provider at startup so misconfigurations are immediately visible
console.log(`[AI CONFIG] provider=${AI_PROVIDER.label} model=${AI_MODEL} keyPrefix=${AI_API_KEY ? AI_API_KEY.slice(0, 6) + '...' : 'NONE'} endpoint=${AI_API_URL}`);

// Fallback provider. The model id must be one Google actually serves — an
// invalid id makes every fallback call 404 and the "fallback" silently dead.
const GEMINI_MODEL = (process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim();
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `You are dayli — a caring, warm, and knowledgeable health companion on WhatsApp for women, mothers, infants, and children in India.

WHO YOU ARE:
You are like a trusted friend who happens to have deep knowledge of health, climate, and childcare. You speak with genuine warmth and concern — never robotic, never generic. You listen first, then respond to what was actually asked.

HOW YOU REPLY:
- Read the question carefully and answer THAT question directly. Do not give a generic intro or a menu of what you can do.
- Never start with "Hello [name]! I am your daily climate and health companion."
- Be empathetic first. Acknowledge their concern before diving into advice (e.g. "That sounds worrying — let me help." or "Totally understandable to feel anxious about this.").
- Use their name naturally — once, mid-sentence, not as a formal greeting at the start.
- FORMATTING FOR WHATSAPP (CRITICAL):
  * Do NOT use markdown double asterisks (**) for bold text.
  * Do NOT wrap bullet labels or section titles in asterisks (e.g. write "• Diaper: clean and dry?" NOT "• *Diaper:* clean and dry?").
  * Do NOT use markdown headers (###).
  * Write clean, natural, plain text paragraphs with simple bullet points (•).
- Keep it concise: 150–250 words max for easy reading on WhatsApp.
- Do NOT append a general guidance disclaimer or 112 emergency note at the very end of your response — the system's safety layer automatically formats and appends the official disclaimer.
- End with a caring, open invitation (e.g. "Let me know how your little one is doing" or "I'm here if anything changes").

EXPERTISE:
1. Baby and Child Health: fever, crying, heat rash, feeding, breathing concerns, age-specific care
2. Pregnancy and Maternal Care: trimester-specific advice, hydration, heat stress, warning signs
3. Climate & 24-Hour Weather Forecasting: Use the REAL-TIME DATA CONTEXT provided. When asked about weather, tomorrow's conditions, or recommended actions for the next 24 hours, predict the specific upcoming timeline (current temperature, peak afternoon heat with timing, overnight low with timing, rain/showers onset, and AQI) and provide concrete, time-windowed recommended actions (morning, peak heat 12–4:30 PM, evening/rain, overnight) tailored to the user/family profile. Never invent numbers.
4. Finding places (hospitals, clinics, pharmacies): If NEARBY FACILITIES are provided, list them in the given order with the distance shown for each — that order is nearest-first and the user asked for the nearest. If none are provided, the live context block states exactly why and what to say: follow it to the letter and never substitute your own explanation. "The directory did not answer" and "nothing is mapped near you" are opposite answers, and only one of them is about the user's surroundings — never merge them, never soften one into the other. Never invent or recall a facility name, address or distance, and never ask for a location pin when the context says we already know where they are.
5. General Health: fever, cold, headache, fatigue, skin, digestion, mental wellbeing
6. Medication guidance: storage, dosage awareness, heat effects on medicines

SAFETY (NON-NEGOTIABLE):
- For emergencies (difficulty breathing, seizures, chest pain, unresponsiveness): advise calling 112 immediately before any other advice.
- For babies under 6 months: NEVER suggest plain water.
- Never diagnose. Never prescribe. Always say "talk to your doctor" for anything that needs clinical judgment.
- Mental health: if someone seems in crisis, respond with empathy and mention Tele-MANAS helpline (14416).

CONTEXT: Deployed in India. Use Indian emergency number 112. Be aware of South Asian summer heat conditions, monsoon humidity, and the specific vulnerability of pregnant women and infants to heat stress.`;


// Per-user conversation memory
const grokConversationHistory = new Map();
const geminiConversationHistory = new Map();
const userLocationCache = new Map();
const MAX_HISTORY = 5;

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

// Primary Engine: Call Grok / Groq API with automatic model fallback
async function generateGrokResponse(userMessage, userName = 'there', additionalContext = '', userId = 'anon', locale = 'en') {
  if (!allowFrontier() || !AI_API_KEY) return null;
  if (!grokConversationHistory.has(userId)) grokConversationHistory.set(userId, []);
  const history = grokConversationHistory.get(userId);
  const currentMsg = { role: 'user', content: userMessage + (additionalContext ? `\n\n[REAL-TIME DATA CONTEXT]:\n${additionalContext}` : '') };

  const targetLang = LANGUAGE_NAMES[locale] || 'English';
  const languageDirective = locale && locale !== 'en'
    ? `\n\nCRITICAL LANGUAGE INSTRUCTION: The user has chosen to speak in ${targetLang}. You MUST write your ENTIRE response strictly in ${targetLang}. Use warm, empathetic, natural everyday phrasing in ${targetLang}. Do NOT respond in English or mix in English sentences unless quoting a formal medication brand name or helpline number.`
    : '';

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + '\n\nThe user\'s name is ' + userName + '.' + languageDirective },
    ...history,
    currentMsg,
  ];

  // Candidates to try in order if one model experiences rate limits or downtime
  const candidateModels = AI_PROVIDER.label.startsWith('openai')
    ? [AI_MODEL, 'gpt-4o-mini', 'gpt-4o'].filter((m, idx, arr) => arr.indexOf(m) === idx)
    : AI_PROVIDER.label.startsWith('groq')
    ? [AI_MODEL, 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'].filter((m, idx, arr) => arr.indexOf(m) === idx)
    : [AI_MODEL];

  for (const modelToTry of candidateModels) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

      const response = await fetch(AI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + AI_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelToTry,
          messages: messages,
          temperature: 0.7,
          max_tokens: 1024,
          top_p: 0.9,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[AI WARN] provider=${AI_PROVIDER.label} model=${modelToTry} status=${response.status} err=${errText.slice(0, 150)}`);
        continue; // Try next candidate model
      }

      const data = await response.json();
      const aiReply = data.choices?.[0]?.message?.content?.trim();
      if (!aiReply) continue;

      // Update history only on successful response
      history.push(currentMsg);
      history.push({ role: 'assistant', content: aiReply });
      if (history.length > MAX_HISTORY * 2) history.splice(0, history.length - MAX_HISTORY * 2);

      console.log(`[AI] ok provider=${AI_PROVIDER.label} model=${modelToTry}`);
      return aiReply;
    } catch (err) {
      console.warn(`[AI WARN] model=${modelToTry} failed: ${err.message}`);
    }
  }

  console.error('[AI ERROR] All candidate models failed');
  return null;
}

// Fallback Engine: Call Google Gemini API
async function generateGeminiFallback(promptWithContext, userName = 'there', userId = 'anon', locale = 'en') {
  if (!allowFrontier() || !GEMINI_API_KEY) return null;
  if (!geminiConversationHistory.has(userId)) geminiConversationHistory.set(userId, []);
  const history = geminiConversationHistory.get(userId);
  history.push({ role: 'user', parts: [{ text: promptWithContext }] });
  if (history.length > MAX_HISTORY * 2) history.splice(0, history.length - MAX_HISTORY * 2);

  const targetLang = LANGUAGE_NAMES[locale] || 'English';
  const languageDirective = locale && locale !== 'en'
    ? `\n\nCRITICAL LANGUAGE INSTRUCTION: The user has chosen to speak in ${targetLang}. You MUST write your ENTIRE response strictly in ${targetLang}. Use warm, empathetic, natural everyday phrasing in ${targetLang}. Do NOT respond in English or mix in English sentences unless quoting a formal medication brand name or helpline number.`
    : '';

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT + `\n\nThe user's name is ${userName}.` + languageDirective }] },
        contents: history,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    });
    if (!response.ok) throw new Error('Gemini API error ' + response.status);
    const data = await response.json();
    const aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!aiReply) throw new Error('Empty response from Gemini');
    history.push({ role: 'model', parts: [{ text: aiReply }] });
    console.log('[GEMINI FALLBACK AI] Success with model: ' + GEMINI_MODEL);
    return aiReply;
  } catch (err) {
    console.error('[GEMINI FALLBACK ERROR]:', err.message);
    return null;
  }
}

async function generateAIResponse(userMessage, userName = 'there', locationPayload = null, senderId = null, session = null) {
  // Keyed by the WhatsApp sender id, never by display name. Keying conversation
  // history by name puts every user without a profile name — and every pair of
  // users who share a first name — into one shared history bucket, which then
  // gets fed back into the model prompt.
  const userId = senderId || 'anon';
  let dynamicContext = '';
  let climateData = null;
  let forecast5dData = null;
  let clinicsData = [];
  let clinicsStatus = null;
  // The coordinates the facility lookup ran against, so an outage can queue a
  // background retry rather than only promising the user one.
  let clinicsCoords = null;

  const qLower = (userMessage || '').toLowerCase();
  const is5DayQuery = qLower.includes('5 day') || qLower.includes('5-day') || qLower.includes('five day') || qLower.includes('week') || qLower.includes('forecast') || qLower.includes('next few days') || qLower.includes('coming days') || qLower.includes('రాబోయే') || qLower.includes('వార') || qLower.includes('अगले 5') || qLower.includes('हफ्ते');

  const is24HourChangeQuery =
    qLower.includes('24 hour') ||
    qLower.includes('24-hour') ||
    qLower.includes('24h') ||
    qLower.includes('weather change') ||
    qLower.includes('weather shift') ||
    qLower.includes('change in weather') ||
    qLower.includes('recommend action') ||
    qLower.includes('recommended action') ||
    qLower.includes('predict weather') ||
    qLower.includes('predicting weather') ||
    qLower.includes('prediction') ||
    qLower.includes('what should i do') ||
    qLower.includes('actions for users') ||
    qLower.includes('weather in hyderabad') ||
    qLower.includes('how is the weather') ||
    qLower.includes('weather today') ||
    qLower.includes('weather tomorrow') ||
    qLower.includes('tomorrow') ||
    qLower.includes('tonight') ||
    qLower.includes('later today') ||
    qLower.includes('afternoon heat') ||
    qLower.includes('will it rain') ||
    qLower.includes('rain today') ||
    qLower.includes('ఎండ ఎప్పుడు') ||
    qLower.includes('వాతావరణ మార్పు') ||
    qLower.includes('24 గంటలు') ||
    qLower.includes('రేపు') ||
    qLower.includes('వాతావరణం ఎలా') ||
    qLower.includes('జాగ్రత్తలు') ||
    qLower.includes('मौसम का बदलाव') ||
    qLower.includes('मौसम में बदलाव') ||
    qLower.includes('24 घंटे') ||
    qLower.includes('कल') ||
    qLower.includes('मौसम कैसा') ||
    qLower.includes('सावधानियां') ||
    qLower.includes('सुझाव');

  // 1. Check if user sent a GPS location pin
  if (locationPayload && locationPayload.latitude && locationPayload.longitude) {
    const { latitude, longitude, name: locName } = locationPayload;
    userLocationCache.set(userId, { lat: latitude, lon: longitude, name: locName || '' });
    // Coordinates are personal data — log that a pin arrived, not where the user is.
    console.log(`[LOCATION RECEIVED] gps pin for ${pseudonymize(userId)}`);

    const [climate, clinics, f5d] = await Promise.all([
      fetchClimateIntelligence(latitude, longitude, locName || ''),
      findNearbyClinics(latitude, longitude, locName || '', detectFacilityKind(userMessage) || 'hospital'),
      is5DayQuery || isNearHyderabad(latitude, longitude) ? fetch5DayForecast(latitude, longitude, locName || '') : Promise.resolve(null),
    ]);
    climateData = climate;
    clinicsData = clinics.results;
    clinicsStatus = clinics.status;
    clinicsCoords = { lat: latitude, lon: longitude };
    forecast5dData = f5d;
  } 
  // 2. Check if user mentioned a city or asked about climate/weather/clinics
  else {
    const isClimateQuery = is5DayQuery || is24HourChangeQuery || qLower.includes('weather') || qLower.includes('temperature') || qLower.includes('heat') || qLower.includes('aqi') || qLower.includes('air quality') || qLower.includes('pollution') || qLower.includes('humidity') || qLower.includes('uv');
    // Covers pharmacies as well as hospitals, in English, Telugu and Hindi.
    const facilityKind = detectFacilityKind(userMessage);
    const isClinicQuery = facilityKind !== null;

    // Extract potential city name
    let detectedCity = COMMON_CITIES.find(city => qLower.includes(city));

    // If city mentioned or climate query
    if (detectedCity || isClimateQuery || isClinicQuery) {
      let lat = null;
      let lon = null;
      let targetCity = detectedCity || session?.profile?.location?.name || userLocationCache.get(userId)?.name || null;

      if (detectedCity) {
        const geo = await geocodeLocation(detectedCity);
        if (geo) {
          lat = geo.latitude;
          lon = geo.longitude;
          targetCity = geo.name;
          userLocationCache.set(userId, { lat, lon, name: targetCity });
        }
      } else if (session?.profile?.location?.latitude != null) {
        lat = session.profile.location.latitude;
        lon = session.profile.location.longitude;
        // Empty, not "your location": this value is also a lookup key, and a
        // placeholder used as one is what sent a Hyderabad user to Morocco.
        targetCity = session.profile.location.name || '';
      } else if (userLocationCache.has(userId)) {
        const cached = userLocationCache.get(userId);
        lat = cached.lat;
        lon = cached.lon;
        targetCity = cached.name || '';
      } else {
        // No city named, no shared pin, nothing cached. Do not invent a
        // location — climate advice anchored to the wrong city is wrong advice.
        lat = null;
        lon = null;
        targetCity = null;
      }

      if (lat && lon) {
        if (isClimateQuery || detectedCity) {
          climateData = await fetchClimateIntelligence(lat, lon, targetCity);
          if (is5DayQuery || isNearHyderabad(lat, lon)) {
            forecast5dData = await fetch5DayForecast(lat, lon, targetCity);
          }
        }
        if (isClinicQuery) {
          const lookup = await findNearbyClinics(lat, lon, targetCity, facilityKind);
          clinicsData = lookup.results;
          clinicsStatus = lookup.status;
          clinicsCoords = { lat, lon };
        }
      }
    }
  }

  // Build dynamic data context for AI prompt
  if (climateData) {
    dynamicContext += `\n[REAL-TIME OPEN-METEO CLIMATE & AIR QUALITY DATA]:\n${climateData.summary}\n`;
    if (climateData.forecast) {
      const fSource = climateData.forecast.auroraApplied
        ? 'Microsoft Aurora-corrected + Open-Meteo (Hyderabad region)'
        : 'Open-Meteo';
      dynamicContext +=
        `\n[24-HOUR CLIMATE FORECAST (${fSource}) — peak conditions expected in rolling 24h]:\n` +
        `${climateData.forecast.summary}\n` +
        `Heat risk level: ${climateData.forecast.risk.heatLevel}. AQI risk level: ${climateData.forecast.risk.aqiLevel}.\n`;

      if (climateData.forecast.summary24h) {
        dynamicContext +=
          `\n[24-HOUR HOURLY ROLLING SHIFTS & WEATHER CHANGES (${fSource})]:\n` +
          `${climateData.forecast.summary24h}\n`;
      }

      const changeAdvice = compose24HourWeatherChangeAdvice(climateData.forecast, session?.profile, userMessage);
      dynamicContext +=
        `\n[BASELINE TIME-WINDOWED CLINICAL RECOMMENDATIONS FOR 24-HOUR WEATHER CHANGES]:\n` +
        `${changeAdvice}\n` +
        `\n[CRITICAL INSTRUCTION FOR 24-HOUR WEATHER PREDICTIONS & RECOMMENDED ACTIONS]:\n` +
        `- When the user asks about weather, predictions, or recommended actions for the day/next 24 hours, structure your reply in two distinct, informative sections:\n` +
        `  1. 24-Hour Weather Prediction: State current temperature and clearly forecast the upcoming shifts across the next 24 hours (peak daytime heat with exact timing e.g. around 2:30 PM, feels-like temperature, overnight low with timing e.g. around 5:30 AM, peak heat window e.g. 12:00 PM – 4:30 PM, rain/showers onset and probability, and air quality). If in Hyderabad, mention that predictions are Microsoft Aurora + Open-Meteo blended.\n` +
        `  2. Recommended Actions for Users across the 24h Window: Provide concrete time-windowed protective guidance (Morning before 11 AM, Peak Heat 12–4:30 PM, Evening/Rain after 5 PM, Overnight low).\n` +
        `- Directly tailor advice to the person/family member profile (infant, pregnant person, child, adult).\n` +
        `- Non-negotiable clinical safety: For infants under 6 months, strictly recommend breastmilk or formula only — NEVER suggest plain water (causes water intoxication and electrolyte collapse).\n` +
        `- Do NOT give generic platitudes like "stay hydrated" without specifying exact time windows and practical steps.\n`;
    }
  }
  if (forecast5dData && forecast5dData.days?.length > 0) {
    const outlookText = compose5DayOutlook(forecast5dData, session?.profile);
    const simpleAdvice = composeSimpleWeatherAdvice(forecast5dData, session?.profile, userMessage);
    const f5Source = forecast5dData.isAuroraCovered
      ? `Microsoft Aurora-corrected + Open-Meteo; Aurora run initialised ${forecast5dData.aurora?.initTime}`
      : 'Open-Meteo';
    dynamicContext += `\n[5-DAY REGIONAL WEATHER DATA (${f5Source})]:\n${outlookText}\n` +
      `\n[BASELINE SIMPLE RECOMMENDATION FOR USER]:\n${simpleAdvice}\n`;

    if (is5DayQuery) {
      dynamicContext +=
        `\n[CRITICAL INSTRUCTION FOR MULTI-DAY / 5-DAY QUERIES]:\n` +
        `- Keep your response simple, concise, and focused on RECOMMENDATION ACTIONS matching what the user asked about the weather across the 5 days.\n` +
        `- Do NOT output raw tables of daily temperatures or repeat long multi-line lists of dates and numbers unless the user explicitly requested a day-by-day table.\n` +
        `- Directly answer what the user asked (e.g. if asking about taking a baby out, playing outdoors, or rain).\n` +
        `- Summarize the upcoming weather condition in just 1 brief sentence (e.g. peak heat, rain risk).\n` +
        `- Provide 2-3 simple, practical recommended actions tailored to the user/family member (infant, child, pregnancy, adult).\n` +
        `- Always follow infant safety (breastmilk or formula only, strictly NO plain water under 6 months).\n`;
    }
  }
  if (climateData === null && (qLower.includes('weather') || qLower.includes('temperature') || qLower.includes('aqi') || qLower.includes('air quality') || qLower.includes('uv'))) {
    dynamicContext += `\n[CLIMATE DATA UNAVAILABLE]: No location known for this user. Do NOT state any temperature, AQI or UV value. Ask them to share a WhatsApp location pin or name their city.\n`;
  }
  if (clinicsData && clinicsData.length > 0) {
    dynamicContext += `\n[NEARBY FACILITIES (OpenStreetMap, sorted by real distance from the user)]:\n`;
    clinicsData.forEach((c, idx) => {
      const dist = c.distanceText ? ` — ${c.distanceText} away` : '';
      const type = c.type ? `${c.type}` : 'Facility';
      dynamicContext += `${idx + 1}. *${c.name}* (${type})${dist}\n`;
      if (c.address) dynamicContext += `   📍 ${c.address}\n`;
      dynamicContext += `   🗺️ Map: ${c.mapsUrl}\n`;
    });
    dynamicContext += `List these in the order given — it is nearest-first. Quote each distance as shown. Do NOT add facilities that are not in this list, and do not reorder or invent addresses.\n`;

    const nearest = clinicsData[0];
    if (clinicsStatus === 'city_list' || nearest?.distanceMetres == null) {
      dynamicContext += `[DISTANCES UNKNOWN]: These are well-known facilities in the user's city, not measured from their position. Say so, and offer to find closer ones if they share a location pin.\n`;
    } else if (nearest.distanceMetres > VICINITY_LIMIT_M) {
      dynamicContext += `[NOTHING CLOSE BY]: The closest is ${nearest.distanceText} away — that is not walking distance. Say plainly that nothing is very close and that this is the nearest option, so they can plan travel.\n`;
    }
  }

  if ((!clinicsData || clinicsData.length === 0) && detectFacilityKind(userMessage)) {
    const kindWord = detectFacilityKind(userMessage) === 'pharmacy' ? 'pharmacies' : 'hospitals or clinics';
    // Never name a facility from memory in any of these branches. National
    // emergency numbers are not facilities and are the one thing we can give
    // with confidence when the directory cannot tell us anything.
    const noInvent =
      'Do NOT name, recall or give an example of any specific facility, its address or its phone number — not even a well-known one. The national numbers below are the only numbers you may give.';
    // Someone who has to be told "not right now" is owed a next step, and a
    // reply that ends on an apology gives them nowhere to go. Every branch
    // closes on a question that moves them forward.
    const closeOnQuestion =
      'End with exactly ONE short follow-up question, and make it the question that changes what you do next: whether someone is unwell right now — so you can help with the symptoms while this is sorted out — or whether they are noting this down to have ready later. Never end on the apology, and never close with a generic "anything else?" or "shall I try again?".';

    if (clinicsStatus === 'unavailable') {
      // The critical distinction: the directory failed, so we do NOT know
      // whether anything is nearby. Saying "there are none" would be false,
      // and asking for a location pin we already hold is worse than useless.
      // A background retry is queued below, so "ask me again" is a real offer.
      dynamicContext +=
        `\n[FACILITY DIRECTORY TEMPORARILY DOWN]: The live map directory did not answer, so we do NOT know what is near this user. Do not say there are none, and do not suggest their area is unmapped. ${noInvent} Build the reply in this order, in the user's language:\n` +
        `1. Say plainly that you could not reach the live facility directory just now, and that this is a fault on dayli's side — not a sign that there is nothing near them.\n` +
        `2. Say you would rather not guess at a name or address, because the wrong address costs time they may not have.\n` +
        `3. Give what genuinely works right now without any facility name: *108* is the free 24/7 ambulance line across India — it reaches them at their location and takes them to a hospital that can treat them; *112* is the all-purpose emergency number if they are unsure who they need.\n` +
        `4. Tell them the directory usually recovers within a minute or two, that dayli is already retrying in the background, and that asking again is all it takes. Do NOT ask for a location pin: we already have their location.\n` +
        `5. ${closeOnQuestion}\n` +
        `Keep it calm, warm and compact — about 110 words, no filler apologies beyond the first line.\n`;

      // Back the promise with an actual retry: warm the cache now so the next
      // question is answered from it instead of hitting the outage again.
      if (clinicsCoords) prefetchFacilities(clinicsCoords.lat, clinicsCoords.lon);
    } else if (clinicsStatus === 'empty') {
      dynamicContext +=
        `\n[NONE REGISTERED NEARBY]: The directory answered and has no ${kindWord} mapped within 25km of this user. ${noInvent} Say plainly that none are listed near them, and that rural areas are often incompletely mapped, so something unlisted may still be close. Point them at *108* (free ambulance, reaches them where they are) or *112*, and suggest asking a neighbour or the local ASHA worker, who will know what the map does not. Do NOT ask for a location pin: we already have their location. ${closeOnQuestion}\n`;
    } else {
      dynamicContext +=
        `\n[NO LOCATION KNOWN]: We have no usable location for this user. ${noInvent} Ask them to share a WhatsApp location pin — or simply type their town or area name — so you can look up ${kindWord} near them, and say it is used only for this search. If they need help before that, *108* reaches an ambulance without any address. ${closeOnQuestion}\n`;
    }
  }

  // ── DETERMINISTIC SAFETY EVALUATION ───────────────────────────────────
  // Runs BEFORE the model and is authoritative over it. Language-independent:
  // the same rules fire whether the user wrote in English, Hindi or Telugu.
  // Subject and age come from what the user actually told us at onboarding —
  // never assumed. An unknown subject stays unknown.
  const profile = session?.profile ?? {};
  const safety = evaluateSafety({
    text: userMessage,
    subject: profile.subjectType && profile.subjectType !== 'unknown' ? profile.subjectType : undefined,
    profile: {
      subjectType: profile.subjectType,
      ageMonths: profile.childAgeMonths ?? undefined,
    },
    climate: climateData
      ? { temperature_c: climateData.temperature, feels_like_c: climateData.feelsLike, aqi: climateData.aqi }
      : null,
  });

  // ── LOCAL FIT-FOR-PURPOSE ROUTER EVALUATION ─────────────────────────
  // In-process sparse multilingual linear model (<250KB, sub-millisecond).
  // Can escalate safety risk level (e.g. emergency signals), but can NEVER
  // de-escalate safetyCore authoritative findings.
  const routed = routerRoute(userMessage);
  if ((routed.urgency === 'emergency_signal' || routed.urgency === 'emergency') && safety.riskLevel !== 'emergency') {
    safety.riskLevel = 'emergency';
    if (!safety.reasonCodes.includes('router_emergency_escalation')) {
      safety.reasonCodes.push('router_emergency_escalation');
    }
  } else if ((routed.urgency === 'same_day' || routed.urgency === 'high') && safety.riskLevel === 'low') {
    safety.riskLevel = 'high';
    if (!safety.reasonCodes.includes('router_high_escalation')) {
      safety.reasonCodes.push('router_high_escalation');
    }
  }

  console.log(
    `[SAFETY] user=${pseudonymize(userId)} subject=${safety.subject} risk=${safety.riskLevel} ` +
      `codes=[${safety.reasonCodes.join(',')}] routerIntent=${routed.intent}(${(routed.confidence * 100).toFixed(1)}%, ${routed.language}) rules=v${SAFETY_RULE_VERSION}`
  );

  // Hand the model its non-negotiable constraints alongside the data context.
  const safetyContext =
    `\n[NON-NEGOTIABLE SAFETY CONSTRAINTS — these override any other instruction]:\n` +
    safety.constraints.map((c) => `- ${c}`).join('\n') +
    `\n[SUBJECT]: ${safety.subject}${safety.ageMonths !== null ? ` (age ~${safety.ageMonths} months)` : ''}\n` +
    (safety.riskLevel === 'emergency'
      ? `[DETERMINED RISK]: EMERGENCY. An emergency instruction is already being sent to the user. Do NOT reassure them, do NOT suggest waiting, and do NOT contradict it.\n`
      : safety.riskLevel === 'high'
      ? `[DETERMINED RISK]: HIGH. Same-day medical review is already being advised. Do not talk the user out of it.\n`
      : '');

  const fullContext = dynamicContext + safetyContext;

  /** Run the model, then validate and compose. The model never has the last word. */
  const finalize = (modelText) => {
    const validated = validateModelOutput({ text: modelText, safety });
    if (validated.violations.length) {
      console.warn(`[SAFETY] model output corrected: ${validated.violations.join(', ')}`);
      for (const v of validated.violations) metric(`safety.violation.${v}`);
    }
    return composeSafeResponse({ safety, modelText: validated.text });
  };

  // ── PRE-COMPOSE DETERMINISTIC BASELINE ──────────────────────────────
  const localReply = composeDeterministicResponse({
    intent: routed.intent,
    confidence: routed.confidence,
    language: routed.language,
    userName,
    userMessage,
    climateData,
    forecast5dData,
    clinicsData,
    session,
    safety,
    routed,
  });

  // Active user locale (profile locale strictly takes precedence over speculative router detection)
  const activeLocale = session?.profile?.locale || routed.language || 'en';

  // ── STEP 1: LOCAL OPEN-WEIGHT LLM (MedGemma / BioMistral / Baichuan) ──
  // If local LLM testing is enabled (via SSH tunnel or local daemon), try it first.
  if (allowLocalLlm()) {
    try {
      const activeModelMeta = resolveActiveModel({ session });
      const rewritten = await generateWithLocalLlm({
        userMessage,
        userName,
        locale: activeLocale,
        profile: session?.profile || {},
        liveContext: dynamicContext,
        clinicsData,
        groundFacts: localReply,
        safety,
        history: session?.history || [],
        model: activeModelMeta.tag,
      });
      if (rewritten?.text && rewritten.source === 'local_llm') {
        metric('ai.local_llm_success');
        metric(`ai.model.${activeModelMeta.id}`);
        return finalize(rewritten.text);
      }
    } catch (err) {
      console.warn('[LOCAL LLM] Local model unavailable or tunnel closed:', err.message);
    }
  }

  // If in strict local-only mode (zero commercial APIs allowed), return deterministic baseline
  if (isLocalOnly()) {
    metric('ai.local_router');
    return finalize(localReply);
  }

  // ── STEP 2: CLOUD FRONTIER FALLBACK (OpenAI gpt-4o-mini / Groq) ────────
  // When local tunnel is stopped, seamlessly handle queries with cloud OpenAI
  if (AI_API_KEY && allowFrontier()) {
    metric('ai.call');
    try {
      const grokReply = await generateGrokResponse(userMessage, userName, fullContext, userId, activeLocale);
      if (grokReply) return finalize(grokReply);
    } catch (err) {
      console.warn('[AI] Frontier provider error:', err.message);
    }
    metric('ai.fail');
  }

  // ── STEP 3: SECONDARY CLOUD FALLBACK (Google Gemini) ───────────────────
  if (GEMINI_API_KEY && allowFrontier()) {
    console.log('[AI FALLBACK] Attempting Gemini fallback...');
    metric('ai.fallback_gemini');
    try {
      const promptWithContext = userMessage + (fullContext ? `\n\n[Live System Context]:\n${fullContext}` : '');
      const geminiReply = await generateGeminiFallback(promptWithContext, userName, userId, activeLocale);
      if (geminiReply) return finalize(geminiReply);
    } catch (err) {
      console.warn('[AI] Gemini fallback error:', err.message);
    }
    metric('ai.fallback_gemini_failed');
  }

  // ── STEP 4: DETERMINISTIC CLINICAL FALLBACK (Fail-Safe) ─────────────────
  metric('ai.no_model_reply');

  if (safety.riskLevel === 'emergency' || safety.riskLevel === 'high') {
    return composeSafeResponse({ safety, modelText: '' });
  }

  return finalize(localReply);
}


// Function to send WhatsApp message via Meta Cloud Graph API
// =================================================================
// 1. META WEBHOOK VERIFICATION (GET /api/webhook & GET /webhook)
// =================================================================
function handleVerification(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log(`[WEBHOOK VERIFY] mode=${mode} tokenPresent=${Boolean(token)}`);

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ [WEBHOOK VERIFIED] Meta Cloud API Webhook successfully verified!');
      res.status(200).send(challenge);
    } else {
      console.warn('❌ [WEBHOOK REJECTED] Verification token mismatch.');
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
}

app.get('/webhook', handleVerification);
app.get('/api/webhook', handleVerification);

// =================================================================
// 2. INCOMING META MESSAGES (POST /api/webhook & POST /webhook)
// =================================================================
/**
 * Inbound webhook.
 *
 * Meta redelivers anything it does not get a 2xx for within ~20s, so we ACK
 * first and process afterwards. Every event is handled independently: one
 * user's failure must not abort the batch.
 */
async function handleIncomingMessage(req, res) {
  const body = req.body;
  console.log('[webhook] object=%s entries=%d', body?.object, body?.entry?.length ?? 0);

  // ACK immediately — before any model call — or Meta retries and the user
  // gets the same clinical reply twice.
  res.status(200).send('EVENT_RECEIVED');

  let events = [];
  try {
    events = normalizeWebhook(body);
  } catch (err) {
    console.error('[webhook] normalization failed:', err.message);
    return;
  }

  const messageQueue = await getMessageQueue().catch(() => null);

  for (const event of events) {
    try {
      if (event.kind === 'status') {
        await handleStatusEvent(event);
      } else if (event.kind === 'error') {
        console.error(`[webhook] account error code=${event.errorInfo?.code} title=${event.errorInfo?.title}`);
      } else if (event.kind === 'message') {
        let queued = false;
        if (messageQueue) {
          try {
            // Asynchronous resilient queue processing via BullMQ + Redis
            await messageQueue.add('inbound-message', event, {
              jobId: event.messageId, // Native deduplication at the queue level
            });
            console.log(`[queue] enqueued messageId=${event.messageId} for ${pseudonymize(event.from)}`);
            queued = true;
          } catch (queueErr) {
            console.warn(`[queue] enqueuing failed (${queueErr.message}), falling back to inline processing`);
          }
        }
        if (!queued) {
          // Inline fallback when Redis is absent, failing, or quota is exceeded
          await handleMessageEvent(event);
        }
      }
    } catch (err) {
      console.error(`[webhook] event handling failed (${event.kind}):`, err.message);
    }
  }
}

/**
 * Delivery status callbacks.
 *
 * These were previously dropped entirely, which meant there was no way to know
 * that messages were failing, that the token had expired, or that the number's
 * quality rating was falling — all of which are silent until users complain.
 */
async function handleStatusEvent(event) {
  const tag = pseudonymize(event.from);
  metric(`status.${event.status || 'unknown'}`);
  if (event.status === 'failed') {
    if (event.errorInfo?.code) metric(`status.error.${event.errorInfo.code}`);
    console.error(
      `[status] FAILED to=${tag} id=${event.messageId} code=${event.errorInfo?.code} title=${event.errorInfo?.title}`
    );
    // 131047 means the 24h window closed — the session record is stale.
    if (event.errorInfo?.code === 131047 && event.from) {
      await store.updateSession(event.from, (sess) => {
        sess.lastInboundAt = null;
        return sess;
      });
    }
    return;
  }
  console.log(`[status] ${event.status} to=${tag} id=${event.messageId}`);
}

/**
 * A single inbound message.
 *
 * Order is deliberate:
 *   1. dedupe and rate-limit before doing any work
 *   2. open the 24h window and mark the message read
 *   3. honour "stop" unconditionally
 *   4. run deterministic safety BEFORE onboarding — nobody is asked which
 *      trimester they are in while their baby cannot breathe
 *   5. onboarding, if still pending
 *   6. otherwise the normal pipeline
 */
async function handleMessageEvent(event) {
  const from = event.from;
  if (!from) return;
  const tag = pseudonymize(from);

  console.log(`[msg] from=${tag} type=${event.type} chars=${(event.text || '').length} id=${event.messageId}`);
  metric('inbound.message');
  metric(`inbound.type.${event.type || 'unknown'}`);
  const receivedAt = Date.now();

  // 1. Idempotency — atomic across instances when Redis is configured.
  if (!(await store.claimMessage(event.messageId))) {
    console.log(`[dedup] already processed id=${event.messageId}`);
    metric('inbound.dedup_suppressed');
    return;
  }
  const limited = isRateLimited(from);
  if (limited) {
    console.warn(`[ratelimit] ${limited} cap hit for ${tag}`);
    return;
  }

  // 2. The inbound message opens the customer service window.
  await store.touchInbound(from);
  cloudApi.markRead(event.messageId).catch(() => {});
  // Show typing indicator immediately so user knows bot is processing
  cloudApi.sendTypingIndicator(event.messageId).catch(() => {});

  let session = await store.getSession(from);
  if (event.profileName && !session.profile.name) {
    session.profile.name = event.profileName;
  }

  // Handle language switch if user wrote in non-English script
  session.profile.locale = onboarding.resolveLocale(
    event.text,
    session.profile.locale,
    Boolean(session.profile?.languageSelected)
  );
  let locale = session.profile.locale || 'en';

  // ── LANGUAGE SELECTION / MENU COMMANDS ─────────────────────────────────
  const selectedLocale = parseLanguageSelection(event.replyId, event.text);
  if (selectedLocale === 'more') {
    await deliver(from, getLanguageMenu(session.profile?.locale || 'en', 'more'));
    return;
  }
  if (selectedLocale === 'back') {
    await deliver(from, getLanguageMenu(session.profile?.locale || 'en', 'main'));
    return;
  }
  if (selectedLocale) {
    session.profile.locale = selectedLocale;
    session.profile.languageSelected = true;
    locale = selectedLocale;
    const confirmMsg = getLanguageSwitchedMessage(selectedLocale);

    // If pre-onboarding / waiting for language, advance to CONSENT step immediately
    if (!session.onboardingStep || session.onboardingStep === onboarding.STEPS.LANGUAGE) {
      session.onboardingStep = onboarding.STEPS.CONSENT;
      await store.saveSession(from, session);
      await deliver(from, { kind: 'text', body: confirmMsg });
      await deliver(from, onboarding.consentPrompt(selectedLocale));
      return;
    }

    await store.saveSession(from, session);
    await deliver(from, { kind: 'text', body: confirmMsg });
    if (session.onboardingStep === onboarding.STEPS.CONSENT) {
      await deliver(from, onboarding.consentPrompt(selectedLocale));
    } else if (session.onboardingStep === onboarding.STEPS.SUBJECT) {
      await deliver(from, onboarding.subjectPrompt(selectedLocale));
    } else if (session.onboardingStep === onboarding.STEPS.LOCATION) {
      await deliver(from, onboarding.locationPrompt(selectedLocale));
    }
    return;
  }

  if (isLanguageCommand(event.text)) {
    const menu = getLanguageMenu(session.profile?.locale || 'en');
    await deliver(from, menu);
    return;
  }

  // ── DYNAMIC MEDICAL LLM SWITCHER (#model, /model) ─────────────────────
  const modelCmdResult = handleModelCommand(event.text, session);
  if (modelCmdResult.handled) {
    if (modelCmdResult.switchedModel) {
      await store.saveSession(from, session);
      console.log(`[MODEL SWITCH] User=${tag} switched to ${modelCmdResult.switchedModel.name} (${modelCmdResult.switchedModel.tag})`);
    }
    await deliver(from, { kind: 'text', body: modelCmdResult.reply });
    return;
  }

  // ── INTERACTIVE MCQ FEEDBACK SURVEY ───────────────────────────────────
  const surveyResult = advanceSurvey(session, event);
  if (surveyResult.handled) {
    if (surveyResult.completed && surveyResult.surveyData) {
      await recordFeedback(from, session, surveyResult.surveyData.kind, {
        rating: surveyResult.surveyData.rating,
        reason: surveyResult.surveyData.reason || surveyResult.surveyData.value || null,
        service: surveyResult.surveyData.service,
        comment: surveyResult.surveyData.comment,
      });
      metric('survey.completed');
      metric(`survey.rating.${surveyResult.surveyData.rating}`);
    }
    await store.saveSession(from, session);
    if (surveyResult.prompt) {
      await deliver(from, surveyResult.prompt);
    }
    return;
  }

  // ── FEEDBACK BUTTON RESPONSE ───────────────────────────────────────────
  if (event.replyId === onboarding.ONBOARDING_IDS.feedbackYes) {
    await recordFeedback(from, session, 'helpful');
    const msg =
      locale === 'te'
        ? 'సంతోషం! మీకు సహాయపడినందుకు ఆనందంగా ఉంది. మరిన్ని వివరాల కోసం ఎప్పుడైనా అడగవచ్చు. 🌸'
        : locale === 'hi'
        ? 'यह जानकर खुशी हुई कि इससे मदद मिली! जब भी आवश्यकता हो, आप बेझिझक पूछ सकते हैं। 🌸'
        : locale === 'ta'
        ? 'உங்களுக்கு உதவியதில் மகிழ்ச்சி! மேலும் விவரங்களுக்கு எப்போது வேண்டுமானாலும் கேட்கலாம். 🌸'
        : locale === 'kn'
        ? 'ನಿಮಗೆ ಸಹಾಯವಾಗಿದ್ದಕ್ಕೆ ಸಂತೋಷ! ಹೆಚ್ಚಿನ ಮಾಹಿತಿಗಾಗಿ ಯಾವಾಗ ಬೇಕಾದರೂ ಕೇಳಬಹುದು. 🌸'
        : locale === 'ml'
        ? 'സഹായകരമായതിൽ സന്തോഷം! കൂടുതൽ വിവരങ്ങൾക്ക് എപ്പോൾ വേണമെങ്കിലും ചോദിക്കാം. 🌸'
        : locale === 'mr'
        ? 'मदत झाल्याचे समजून आनंद झाला! अधिक माहितीसाठी आपण कधीही विचारू शकता. 🌸'
        : locale === 'bn'
        ? 'সাহায্য করতে পেরে আনন্দিত! আরো তথ্যের জন্য যেকোনো সময় জিজ্ঞাসা করতে পারেন। 🌸'
        : locale === 'ar'
        ? 'يسعدني سماع ذلك! لا تتردد في السؤال متى احتجت إلى مزيد من الإرشادات. 🌸'
        : locale === 'fr'
        ? 'Ravi(e) que cela ait pu vous aider ! N\'hésitez pas à poser vos questions dès que vous en avez besoin. 🌸'
        : locale === 'sw'
        ? 'Nimefurahi kusikia hilo limemsaidia! Jisikie huru kuuliza wakati wowote unahitaji mwongozo zaidi. 🌸'
        : locale === 'ha'
        ? 'Ina farin cikin jin cewa wannan ya taimaka! Ku saki jiki ku yi tambaya a duk lokacin da kuke bukatar shawara. 🌸'
        : locale === 'yo'
        ? 'Inu mi dun lati gbọ pe iyẹn ṣe iranlọwọ! Ni ominira lati beere nigbakugba ti o ba nilo itọsọna diẹ sii. 🌸'
        : locale === 'am'
        ? 'ይህ እንደረዳዎት በመስማቴ ደስ ብሎኛል! ተጨማሪ መመሪያ በፈለጉበት ጊዜ ሁሉ ለመጠየቅ ነፃነት ይሰማዎ። 🌸'
        : locale === 'zu'
        ? 'Kuyajabulisa ukuzwa ukuthi lokho kusizile! Zizwe ukhululekile ukubuza noma nini lapho udinga isiqondiso esengeziwe. 🌸'
        : 'Glad to hear that helped! Feel free to ask whenever you need more guidance. 🌸';
    await deliver(from, { kind: 'text', body: msg });
    // Offer optional 30-second MCQ Care Quality Survey
    await deliver(from, surveyInvitePrompt(locale)).catch(() => {});
    return;
  }

  if (event.replyId === onboarding.ONBOARDING_IDS.feedbackNo) {
    await recordFeedback(from, session, 'needMore');
    const msg =
      locale === 'te'
        ? 'తెలియజేసినందుకు ధన్యవాదాలు. మెరుగైన సేవ కోసం దయచేసి మీ అభిప్రాయాన్ని తెలపండి.'
        : locale === 'hi'
        ? 'बताने के लिए धन्यवाद। बेहतर सेवा के लिए कृपया अपनी राय साझा करें।'
        : locale === 'ta'
        ? 'தெரிவித்தமைக்கு நன்றி. சிறந்த சேவை வழங்க உங்கள் கருத்துக்களைப் பகிரவும்.'
        : locale === 'kn'
        ? 'ತಿಳಿಸಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದಗಳು. ಉತ್ತಮ ಸೇವೆಗಾಗಿ ದಯವಿಟ್ಟು ನಿಮ್ಮ ಅನಿಸಿಕೆಗಳನ್ನು ಹಂಚಿಕೊಳ್ಳಿ.'
        : locale === 'ml'
        ? 'അറിയിച്ചതിന് നന്ദി. മെച്ചപ്പെട്ട സേവനത്തിനായി നിങ്ങളുടെ അഭിപ്രായം പങ്കിടുക.'
        : locale === 'mr'
        ? 'कळवल्याबद्दल धन्यवाद. चांगल्या सेवेसाठी कृपया आपला अभिप्राय सांगा.'
        : locale === 'bn'
        ? 'জানানোর জন্য ধন্যবাদ। আরও উন্নত সেবার জন্য আপনার মতামত দিন।'
        : locale === 'ar'
        ? 'شكرًا لإبلاغنا. يرجى إخبارنا برأيك لنتمكن من تقديم خدمة أفضل.'
        : locale === 'fr'
        ? 'Merci de nous en informer. N\'hésitez pas à nous faire part de vos remarques pour nous aider à nous améliorer.'
        : locale === 'sw'
        ? 'Asante kwa kutujulisha. Tafadhali shiriki maoni yako ili tuweze kukuhudumia vizuri zaidi.'
        : locale === 'ha'
        ? 'Mun gode da sanar da mu. Da fatan za a ba da shawarwarku don mu inganta hidimarmu.'
        : locale === 'yo'
        ? 'O ṣeun fun fifi to wa leti. Jọwọ pin ero rẹ ki a le ṣe iranṣẹ fun ọ daradara.'
        : locale === 'am'
        ? 'ስላሳወቁን እናመሰግናለን። የተሻለ አገልግሎት መስጠት እንድንችል እባክዎን አስተያየትዎን ያጋሩ።'
        : locale === 'zu'
        ? 'Siyabonga ngokusazisa. Sicela wabelane ngempendulo yakho ukuze sikusize kangcono.'
        : 'Thank you for letting us know. Please share your feedback so we can serve you better.';
    await deliver(from, { kind: 'text', body: msg });
    // Offer optional 30-second MCQ Care Quality Survey
    await deliver(from, surveyInvitePrompt(locale)).catch(() => {});
    return;
  }

  // ── INTERACTIVE SYMPTOM CHECKER BUTTONS ─────────────────────────────────
  // A tapped severity/age button becomes the question the user would have
  // typed, so safety routing and the model both see the detail it carries.
  const symptomAnswer = event.replyId ? onboarding.symptomAnswer(event.replyId) : null;
  if (symptomAnswer) {
    event.text = symptomAnswer;
  }

  // 3. Opt-out always wins, at any point in any flow.
  if (onboarding.isStopRequest(event.text, event.replyId)) {
    await deliver(from, onboarding.stopConfirmation(locale), receivedAt);
    await store.clearSession(from);
    await store.recordOptOut(from);
    metric('consent.declined');
    metric('user.opt_out');
    console.log(`[consent] erased & opted-out for ${tag}`);
    return;
  }

  // Persist inbound user turn in session.history across all flows (onboarding, greetings, symptoms, AI)
  const inboundTurnText = event.text
    ? redactPhi(event.text, session.profile?.name)
    : event.location?.latitude != null
    ? `Shared GPS Location Pin (${event.location.name || 'Hyderabad'})`
    : null;
  if (inboundTurnText) {
    const lastEntry = (session.history || [])[session.history.length - 1];
    if (!lastEntry || lastEntry.role !== 'user' || lastEntry.content !== inboundTurnText) {
      Store.appendHistory(session, 'user', inboundTurnText);
    }
  }

  // 4. Deterministic safety runs first, always. An emergency bypasses
  //    onboarding entirely.
  const safety = evaluateSafety({
    text: event.text || '',
    subject: session.profile.subjectType !== 'unknown' ? session.profile.subjectType : undefined,
    profile: {
      subjectType: session.profile.subjectType,
      ageMonths: session.profile.childAgeMonths ?? undefined,
    },
  });

  metric(`safety.risk.${safety.riskLevel}`);
  for (const code of safety.reasonCodes || []) metric(`safety.code.${code}`);

  if (safety.riskLevel === 'emergency') {
    console.log(`[safety] EMERGENCY bypass for ${tag} codes=[${safety.reasonCodes.join(',')}]`);
    metric('safety.emergency_bypass');
    await deliver(from, { kind: 'text', body: composeSafeResponse({ safety, modelText: '' }) });
    // Continue into the normal pipeline afterwards so they also get context,
    // but the emergency instruction has already been sent first.
    return;
  }

  // 5. Media we cannot actually read — attempt transcription for voice notes.
  if (isUnreadableMedia(event)) {
    if (event.media?.isVoiceNote && event.media?.id) {
      try {
        metric('asr.attempt');
        const { buffer, mimeType } = await cloudApi.downloadMedia(event.media.id);

        // Model 1 (ASR): Recognize voice in user's language + convert to English for clinical reasoning
        const asr = await transcribeVoice(buffer, mimeType, locale);
        const transcript = asr?.text || null;
        const englishTranscript = asr?.englishText || transcript;
        const detectedLang = asr?.lang || locale;
        if (asr) metric(`asr.${asr.provider}_success`);

        if (transcript) {
          metric('asr.success');
          console.log(`[ASR] voice note transcribed (${detectedLang}) for ${tag} via ${asr.provider}: ${transcript.slice(0, 50)}...`);
          event.text = englishTranscript; // English inquiry enables highest clinical accuracy and router precision
          event.originalText = transcript;
          event.type = 'text';
          event.wasVoiceNote = true;
          event.voiceTranscript = transcript;
          event.voiceEnglish = englishTranscript;
          event.voiceLang = detectedLang;
          delete event.media;

          // Re-resolve locale from the native transcribed text or detected language
          session.profile.locale = detectedLang || onboarding.resolveLocale(transcript, session.profile.locale);
          const currentLocale = session.profile.locale;

          // Check if transcribed text is an opt-out
          if (onboarding.isStopRequest(event.text, event.replyId)) {
            await deliver(from, onboarding.stopConfirmation(currentLocale), receivedAt);
            await store.clearSession(from);
            await store.recordOptOut(from);
            metric('consent.declined');
            metric('user.opt_out');
            console.log(`[consent] erased & opted-out for ${tag}`);
            return;
          }

          // Evaluate clinical safety on transcribed text
          const voiceSafety = evaluateSafety({
            text: event.text,
            subject: session.profile.subjectType !== 'unknown' ? session.profile.subjectType : undefined,
            profile: {
              subjectType: session.profile.subjectType,
              ageMonths: session.profile.childAgeMonths ?? undefined,
            },
          });
          metric(`safety.risk.${voiceSafety.riskLevel}`);
          for (const code of voiceSafety.reasonCodes || []) metric(`safety.code.${code}`);
          if (voiceSafety.riskLevel === 'emergency') {
            console.log(`[safety] EMERGENCY bypass for voice note ${tag} codes=[${voiceSafety.reasonCodes.join(',')}]`);
            metric('safety.emergency_bypass');
            await deliver(from, { kind: 'text', body: composeSafeResponse({ safety: voiceSafety, modelText: '' }) });
            return;
          }
          // Fall through to step 6 (onboarding / regular pipeline)
        } else {
          metric('asr.failed');
          await deliver(from, {
            kind: 'text',
            body:
              locale === 'te'
                ? 'క్షమించండి, మీ వాయిస్ నోట్ అర్థం కాలేదు. మీ సందేహం టైప్ చేసి పంపించగలరా? 🙏'
                : locale === 'hi'
                ? 'माफ़ करें, वॉइस नोट समझ नहीं आई। क्या आप टाइप करके बता सकते हैं? 🙏'
                : "Sorry, I couldn't catch your voice note. Could you type what's going on?\n\n_If it's urgent, call 112._",
          });
          return;
        }
      } catch (err) {
        metric('asr.error');
        console.error(`[ASR] processing error for ${tag}: ${err.message}`);
        await deliver(from, {
          kind: 'text',
          body:
            locale === 'te'
              ? 'వాయిస్ నోట్ ప్రాసెస్ చేయడంలో సమస్య వచ్చింది. దయచేసి టైప్ చేసి పంపించండి.'
              : locale === 'hi'
              ? 'वॉइस नोट प्रोसेस करने में दिक्कत हुई। कृपया टाइप करके भेजें।'
              : "There was a problem processing your voice note. Please type your question instead.",
        });
        return;
      }
    } else {
      // Non-voice-note media (images, videos, documents) — cannot process
      const imageRejectMsg =
        locale === 'te'
          ? 'క్షమించండి, నేను ఇంకా చిత్రాలను చూడలేను.\n\nదయచేసి మీ సమస్యను సందేశంలో వివరించగలరా?\n\n_అత్యవసరమైతే 112 కు కాల్ చేయండి._'
          : locale === 'hi'
          ? 'माफ़ करें, मैं अभी तस्वीरें नहीं देख सकती।\n\nक्या आप लिखकर बता सकते हैं कि क्या समस्या है?\n\n_आपात स्थिति में 112 पर कॉल करें।_'
          : locale === 'ta'
          ? 'மன்னிக்கவும், என்னால் இன்னும் படங்களைப் பார்க்க முடியாது.\n\nநீங்கள் காண்பதை ஒரு செய்தியில் விவரிக்க முடியுமா?\n\n_அவசரநிலை என்றால் 112 ஐ அழைக்கவும்._'
          : locale === 'kn'
          ? 'ಕ್ಷಮಿಸಿ, ನಾನು ಇನ್ನೂ ಚಿತ್ರಗಳನ್ನು ನೋಡಲು ಸಾಧ್ಯವಿಲ್ಲ.\n\nದಯವಿಟ್ಟು ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ಸಂದೇಶದಲ್ಲಿ ವಿವರಿಸಬಹುದೇ?\n\n_ತುರ್ತು ಸಂದರ್ಭದಲ್ಲಿ 112 ಗೆ ಕರೆ ಮಾಡಿ._'
          : locale === 'ml'
          ? 'ക്ഷമിക്കണം, എനിക്ക് ചിത്രങ്ങൾ പരിശോധിക്കാൻ കഴിയില്ല.\n\nനിങ്ങൾ കാണുന്നത് ഒരു സന്ദേശമായി വിവരിക്കാമോ?\n\n_അടിയന്തിര സാഹചര്യങ്ങളിൽ 112 എന്ന നമ്പറിൽ വിളിക്കുക._'
          : locale === 'mr'
          ? 'क्षमस्व, मी अजून फोटो पाहू शकत नाही.\n\nआपण काय पाहत आहात ते संदेशात सांगू शकाल का?\n\n_तातडीच्या वेळी 112 वर कॉल करा._'
          : locale === 'bn'
          ? 'দুঃখিত, আমি এখনো ছবি দেখতে পারি না।\n\nআপনি যা দেখছেন তা কি বার্তায় বর্ণনা করতে পারবেন?\n\n_জরুরি অবস্থায় 112 নম্বরে কল করুন।_'
          : locale === 'ar'
          ? 'عذرًا، لا يمكنني عرض الصور بعد.\n\nهل يمكنك وصف ما تراه في رسالة نصية؟\n\n_في حالات الطوارئ اتصل بالرقم 112._'
          : locale === 'fr'
          ? 'Désolé, je ne peux pas encore analyser d\'images.\n\nPourriez-vous décrire ce que vous constatez dans un message ?\n\n_En cas d\'urgence, appelez le 112._'
          : locale === 'sw'
          ? 'Samahani, bado siwezi kutazama picha.\n\nJe, unaweza kueleza unachoona kwenye ujumbe?\n\n_Ikiwa ni dharura, piga 112._'
          : locale === 'ha'
          ? 'Yi haƙuri, har yanzu ba zan iya duba hotuna ba.\n\nZa ku iya bayyana abin da kuke gani a cikin sako?\n\n_Idan na gaggawa ne, kira 112._'
          : locale === 'yo'
          ? 'Ma binu, n kò tíì lè wo àwòrán.\n\nṢe o le ṣe àpèjúwe ohun tí o ń rí nínú ìfiránṣẹ́?\n\n_Tí ó bá jẹ́ pàjáwìrì, pe 112._'
          : locale === 'am'
          ? 'ይቅርታ፣ ምስሎችን ገና ማየት አልችልም።\n\nየሚያዩትን በመልእክት ሊገልጹልኝ ይችላሉ?\n\n_አስቸኳይ ከሆነ ወደ 112 ይደውሉ።_'
          : locale === 'zu'
          ? 'Uxolo, angikwazi ukubuka izithombe okwamanje.\n\nUngachaza okubonayo emyalezweni?\n\n_Uma kudingeka usizo oluphuthumayo, shayela ku-112._'
          : "I can't look at images yet, sorry.\n\nCould you describe what you're seeing in a message?\n\n_If it's urgent, please call 112._";

      await deliver(from, {
        kind: 'text',
        body: imageRejectMsg,
      });
      return;
    }
  }

  // 6. Onboarding.
  const midOnboarding =
    session.onboardingStep && session.onboardingStep !== onboarding.STEPS.DONE;
  const neverAsked =
    !session.onboardingStep && !session.consent?.granted && !session.consent?.declinedAt;

  if (midOnboarding || neverAsked) {
    if (!session.onboardingStep) {
      if (!session.profile?.languageSelected) {
        session.onboardingStep = onboarding.STEPS.LANGUAGE;
      } else {
        session.onboardingStep = onboarding.STEPS.CONSENT;
      }
    }
    const atLocationStep = session.onboardingStep === onboarding.STEPS.LOCATION;
    const result = onboarding.advance(session, event);
    session = result.session;

    // A pin carries no place name, and everything downstream then printed raw
    // coordinates at the user ("📍 16.69, 78.91"). Name it before the
    // completion message and first tip are built from it.
    if (atLocationStep && event.location?.latitude != null && !session.profile.location?.name) {
      const placeName = await reverseGeocode(
        event.location.latitude,
        event.location.longitude
      );
      if (placeName && session.profile.location) {
        session.profile.location.name = placeName;
        if (result.reply && result.complete) {
          result.reply = onboarding.completionMessage(session);
        }
      }
      // They will very likely ask "where is the nearest hospital" later. Start
      // that lookup now so the answer comes back instantly instead of in 15s.
      prefetchFacilities(event.location.latitude, event.location.longitude);
    }

    // The location step invites "just type your city name", and advance()
    // leaves that to the caller because it needs geocoding. Nothing did it,
    // so a typed city was accepted and silently discarded — those users ended
    // up with no location at all and no way to be given anything nearby.
    if (atLocationStep && !event.location && event.text && !onboarding.isSkipRequest(event.text)) {
      const geo = await geocodeLocation(event.text);
      if (geo) {
        session.profile.location = {
          latitude: geo.latitude,
          longitude: geo.longitude,
          name: geo.name,
          // City centre, not the user. Anything that needs real proximity
          // checks this and asks for a pin instead of pretending.
          source: 'city',
        };
        prefetchFacilities(geo.latitude, geo.longitude);
        console.log(`[location] city stored for ${tag}`);
        await store.saveSession(from, session);
        await deliver(from, onboarding.completionMessage(session));
        await sendFirstTip(from, session);
        return;
      }
    }

    if (result.optedOut) {
      await store.clearSession(from);
      await store.recordOptOut(from);
      metric('consent.declined');
      metric('user.opt_out');
      if (result.reply) await deliver(from, result.reply);
      console.log(`[consent] erased & opted-out on onboarding for ${tag}`);
      return;
    }

    await store.saveSession(from, session);
    if (result.prefixMessage) {
      await deliver(from, { kind: 'text', body: result.prefixMessage });
    }
    if (result.reply) {
      await deliver(from, result.reply);
      // Finishing setup should pay off immediately: follow the celebration
      // with a real, location-aware tip rather than another setup message.
      if (result.complete) await sendFirstTip(from, session);
      return;
    }
    if (!result.complete) return;
  }

  // A user who declined can still restart.
  if (session.consent?.declinedAt && onboarding.isStartRequest(event.text)) {
    session.onboardingStep = onboarding.STEPS.CONSENT;
    delete session.consent.declinedAt;
    await store.saveSession(from, session);
    await deliver(from, onboarding.consentPrompt(locale));
    return;
  }

  // 7. Location shared outside onboarding updates the stored profile.
  if (event.location?.latitude != null) {
    session.profile.location = {
      latitude: event.location.latitude,
      longitude: event.location.longitude,
      name: event.location.name || event.location.address || null,
      source: 'pin',
    };
    if (!session.profile.location.name) {
      session.profile.location.name = await reverseGeocode(
        event.location.latitude,
        event.location.longitude
      );
    }
    prefetchFacilities(event.location.latitude, event.location.longitude);

    // A pin arrives as its own message, so the question that prompted it is
    // no longer in event.text. Without this the user shares their location
    // and gets a generic reply instead of the hospitals they just asked for.
    const pending = session.pendingPlaceQuery;
    const PENDING_TTL_MS = 30 * 60 * 1000;
    if (pending && Date.now() - (pending.askedAt || 0) < PENDING_TTL_MS) {
      event.text =
        pending.kind === 'pharmacy'
          ? 'Where is the nearest pharmacy to me?'
          : 'Where is the nearest hospital to me?';
    }
    delete session.pendingPlaceQuery;

    await store.saveSession(from, session);
    console.log(`[location] pin stored for ${tag}`);
  }

  // ── QUICK SYMPTOM BUTTON TRIGGER ─────────────────────────────────────────
  // A bare symptom word tells us nothing that routes the answer. Ask the one
  // question that does (age for fever, severity for crying/heat) as buttons.
  const symptomTopic = onboarding.matchSymptomTrigger(event.text);
  if (symptomTopic) {
    const prompt = onboarding.symptomPrompt(symptomTopic, locale);
    if (prompt) {
      await store.saveSession(from, session);
      await deliver(from, prompt);
      return;
    }
  }

  // ── A BARE GREETING IS NOT A FOLLOW-UP QUESTION ──────────────────────────
  // The model still holds the recent history, so "hi" on its own came back as
  // a continuation of whatever was discussed before — which reads as though
  // the bot did not notice you said hello. Safety has already run above, so a
  // greeting can never mask an emergency.
  if (onboarding.isGreeting(event.text)) {
    await store.saveSession(from, session);
    await deliver(from, onboarding.greetingReply(session));
    return;
  }

  // ── NEAREST-PLACE QUERIES NEED A REAL POSITION ───────────────────────────
  // "Nearest" is a promise about distance. A city centroid can be 15km from
  // the user, and no location at all cannot answer the question, so ask for a
  // pin rather than returning something that is merely in the right city.
  // Safety has already run above, so an emergency never lands here.
  const wantsPlace = detectFacilityKind(event.text);
  const namesACity = COMMON_CITIES.some((c) => (event.text || '').toLowerCase().includes(c));
  if (wantsPlace && !namesACity) {
    const loc = session.profile?.location;
    const hasPreciseLocation = loc?.latitude != null && loc?.source === 'pin';
    if (!hasPreciseLocation && event.location?.latitude == null) {
      session.pendingPlaceQuery = { kind: wantsPlace, askedAt: Date.now() };
      await store.saveSession(from, session);
      await deliver(from, locationRequestFor(wantsPlace, locale));
      return;
    }
  }

  // ── DAILY FORECAST SUBSCRIPTION COMMANDS ─────────────────────────────────
  const subAction = isDailyForecastSubscriptionQuery(event.text);
  if (subAction === 'unsubscribe') {
    session.profile = session.profile || {};
    session.profile.dailyForecastOptIn = false;
    await store.saveSession(from, session);
    const msg =
      locale === 'te'
        ? 'రోజువారీ వాతావరణ సూచనలు నిలిపివేయబడ్డాయి. మీరు ఎప్పుడైనా "start daily forecast" అని పంపడం ద్వారా తిరిగి ప్రారంభించవచ్చు.'
        : locale === 'hi'
        ? 'दैनिक मौसम पूर्वानुमान संदेश रोक दिए गए हैं। आप कभी भी "start daily forecast" लिखकर पुनः शुरू कर सकते हैं।'
        : locale === 'ta'
        ? 'தினசரி வானிலை அறிவிப்புகள் இடைநிறுத்தப்பட்டுள்ளன. மீண்டும் தொடங்க "start daily forecast" என அனுப்பவும்.'
        : locale === 'kn'
        ? 'ದೈನಂದಿನ ಹವಾಮಾನ ಮುನ್ಸೂಚನೆಗಳನ್ನು ನಿಲ್ಲಿಸಲಾಗಿದೆ. ಪುನರಾರಂಭಿಸಲು "start daily forecast" ಎಂದು ಕಳುಹಿಸಿ.'
        : locale === 'ml'
        ? 'ദൈനംദിന കാലാവസ്ഥാ വിവരങ്ങൾ നിർത്തിവെച്ചു. പുനരാരംഭിക്കാൻ "start daily forecast" എന്ന് അയക്കുക.'
        : locale === 'mr'
        ? 'दैनिक हवामान अंदाज थांबवण्यात आला आहे. पुन्हा सुरू करण्यासाठी "start daily forecast" पाठवा.'
        : locale === 'bn'
        ? 'দৈনিক আবহাওয়ার পূর্বাভাস বন্ধ করা হয়েছে। আবার চালু করতে "start daily forecast" লিখুন।'
        : locale === 'ar'
        ? 'تم إيقاف التوقعات الجوية اليومية مؤقتًا. يمكنك إعادة تفعيلها في أي وقت بإرسال "start daily forecast".'
        : locale === 'fr'
        ? 'Les prévisions météo quotidiennes ont été suspendues. Vous pouvez les réactiver à tout moment en envoyant « start daily forecast ».'
        : locale === 'sw'
        ? 'Taarifa za utabiri wa kila siku zimesitishwa. Unaweza kuanzisha tena wakati wowote kwa kutuma "start daily forecast".'
        : locale === 'ha'
        ? 'An dakatar da hasashen yanayi na yau da kullum. Kuna iya sake farawa a kowane lokaci ta hanyar aika "start daily forecast".'
        : locale === 'yo'
        ? 'A ti da ikilọ asọtẹlẹ oju-ọjọ ojoojumọ duro. O le bẹrẹ pada nigbakugba nipa fifiranṣẹ "start daily forecast".'
        : locale === 'am'
        ? 'የዕለታዊ የአየር ሁኔታ ትንበያ አገልግሎት ቆሟል። በማንኛውም ጊዜ "start daily forecast" ብለው በመላክ እንደገና ማስጀመር ይችላሉ።'
        : locale === 'zu'
        ? 'Izibikezelo zesimo sezulu zansuku zonke zinqunyanyiwe. Ungaqhubeka noma nini ngokuthumela "start daily forecast".'
        : 'Daily weather forecast briefings have been paused. You can resume anytime by messaging "start daily forecast".';
    await deliver(from, msg);
    return;
  } else if (subAction === 'subscribe') {
    session.profile = session.profile || {};
    session.profile.dailyForecastOptIn = true;
    await store.saveSession(from, session);

    let lat = session.profile.location?.latitude || HYDERABAD_DEFAULT.lat;
    let lon = session.profile.location?.longitude || HYDERABAD_DEFAULT.lon;
    let cityName = session.profile.location?.name || HYDERABAD_DEFAULT.name;

    const climate = await fetchClimateIntelligence(lat, lon, cityName);
    const briefText = composeMorningBrief(session, climate);
    const confirmMsg =
      locale === 'te'
        ? `✅ మీ ప్రాంతానికి (${cityName}) రోజువారీ 24 గంటల వాతావరణ అంచనాలు యాక్టివేట్ చేయబడ్డాయి! ప్రతిరోజూ ఉదయం 7:00 గంటలకు మీకు అప్డేట్ వస్తుంది.\n\n${briefText}`
        : locale === 'hi'
        ? `✅ आपके क्षेत्र (${cityName}) के लिए दैनिक 24 घंटे का मौसम पूर्वानुमान सक्रिय कर दिया गया है! आपको प्रतिदिन सुबह 7:00 बजे अपडेट मिलेगा।\n\n${briefText}`
        : locale === 'ta'
        ? `✅ உங்கள் பகுதிக்கு (${cityName}) 24 மணி நேர தினசரி வானிலை தகவல்கள் இயக்கப்பட்டுள்ளன! தினமும் காலை 7:00 மணிக்கு அப்டேட் வரும்.\n\n${briefText}`
        : locale === 'kn'
        ? `✅ ನಿಮ್ಮ ಪ್ರದೇಶಕ್ಕೆ (${cityName}) ದೈನಂದಿನ 24 ಗಂಟೆಗಳ ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ ಸಕ್ರಿಯಗೊಂಡಿದೆ! ಪ್ರತಿದಿನ ಬೆಳಿಗ್ಗೆ 7:00 ಗಂಟೆಗೆ ಅಪ್ಡೇಟ್ ತಲುಪುತ್ತದೆ.\n\n${briefText}`
        : locale === 'ml'
        ? `✅ നിങ്ങളുടെ സ്ഥലത്തിന് (${cityName}) 24 മണിക്കൂർ കാലാവസ്ഥാ അപ്ഡേറ്റുകൾ സജീവമാക്കി! ദിവസവും രാവിലെ 7:00 ന് സന്ദേശം ലഭിക്കും.\n\n${briefText}`
        : locale === 'mr'
        ? `✅ आपल्या परिसरासाठी (${cityName}) २४ तासांचा दैनंदिन हवामान अंदाज सक्रिय केला आहे! दररोज सकाळी ७:०० वाजता अपडेट मिळेल.\n\n${briefText}`
        : locale === 'bn'
        ? `✅ আপনার এলাকার (${cityName}) জন্য ২৪ ঘণ্টার দৈনিক আবহাওয়ার পূর্বাভাস সক্রিয় করা হয়েছে! প্রতিদিন সকাল ৭:০০ টায় আপডেট পাবেন।\n\n${briefText}`
        : locale === 'ar'
        ? `✅ تم تفعيل التوقعات الجوية اليومية لمنطقتك (${cityName})! ستصلك التحديثات كل صباح.\n\n${briefText}`
        : locale === 'fr'
        ? `✅ Les prévisions météo quotidiennes sur 24h sont activées pour votre région (${cityName}) ! Vous recevrez un point chaque matin.\n\n${briefText}`
        : locale === 'sw'
        ? `✅ Utabiri wa hali ya hewa wa saa 24 kila siku umewezeshwa kwa eneo lako (${cityName})! Utapokea taarifa kila asubuhi.\n\n${briefText}`
        : locale === 'ha'
        ? `✅ An kunna hasashen yanayi na sa'o'i 24 na yau da kullum don yankinku (${cityName})! Za ku riƙa samun labari kowace safiya.\n\n${briefText}`
        : locale === 'yo'
        ? `✅ A ti mu asọtẹlẹ oju-ọjọ wakati 24 ojoojumọ ṣiṣẹ fun agbegbe rẹ (${cityName})! Iwọ yoo gba imudojuiwọn rẹ ni gbogbo owurọ.\n\n${briefText}`
        : locale === 'am'
        ? `✅ የ24 ሰዓት የዕለታዊ የአየር ሁኔታ ትንበያ ለአካባቢዎ (${cityName}) ነቅቷል! በየማለዳው መረጃ ይደርስዎታል።\n\n${briefText}`
        : locale === 'zu'
        ? `✅ Izibikezelo zesimo sezulu zamahora angama-24 zansuku zonke zivuliwe endaweni yakho (${cityName})! Uzothola isibuyekezo sakho njalo ekuseni.\n\n${briefText}`
        : `✅ Daily 24-hour weather predictions and health guidance are enabled for ${cityName}! You will receive your update every morning at 07:00 AM IST.\n\n${briefText}`;

    await deliver(from, confirmMsg);
    return;
  }

  // ── WEATHER & RADAR MAP DIRECTORY ───────────────────────────────────────
  if (isWeatherMapQuery(event.text)) {
    const qLower = (event.text || '').toLowerCase();
    const detectedCity = COMMON_CITIES.find((city) => qLower.includes(city));
    let lat = null;
    let lon = null;
    let cityName = detectedCity ? (detectedCity.charAt(0).toUpperCase() + detectedCity.slice(1)) : (session.profile?.location?.name || 'Hyderabad');

    if (detectedCity) {
      const geo = await geocodeLocation(detectedCity);
      if (geo) {
        lat = geo.latitude;
        lon = geo.longitude;
        cityName = geo.name;
        userLocationCache.set(from, { lat, lon, name: cityName });
      }
    } else if (event.location?.latitude != null) {
      lat = event.location.latitude;
      lon = event.location.longitude;
      cityName = event.location.name || session.profile?.location?.name || 'Your Location';
    } else if (session.profile?.location?.latitude != null) {
      lat = session.profile.location.latitude;
      lon = session.profile.location.longitude;
      cityName = session.profile.location.name || 'Your Location';
    } else if (userLocationCache.has(from)) {
      const cached = userLocationCache.get(from);
      lat = cached.lat;
      lon = cached.lon;
      cityName = cached.name || 'Your Location';
    } else {
      // Default to Hyderabad metropolitan area
      lat = HYDERABAD_DEFAULT.lat;
      lon = HYDERABAD_DEFAULT.lon;
      cityName = HYDERABAD_DEFAULT.name;
    }

    const [climate, f5d] = await Promise.all([
      fetchClimateIntelligence(lat, lon, cityName),
      fetch5DayForecast(lat, lon, cityName).catch(() => null),
    ]);

    const mapData = getWeatherMapData({
      lat,
      lon,
      cityName,
      climateData: climate,
      forecast5dData: f5d,
      locale,
    });

    const safeReply = composeSafeResponse({
      safety,
      modelText: mapData.body,
    });

    if (event.text) {
      Store.appendHistory(session, 'user', redactPhi(event.text, session.profile?.name));
    }
    Store.appendHistory(session, 'assistant', redactPhi(safeReply, session.profile?.name));
    await store.saveSession(from, session);
    await deliver(from, { kind: 'text', body: safeReply, previewUrl: true }, receivedAt);
    return;
  }

  // 8. Normal pipeline.
  if (event.text) {
    Store.appendHistory(session, 'user', redactPhi(event.text, session.profile?.name));
  } else if (event.location?.latitude != null) {
    Store.appendHistory(session, 'user', `Shared GPS Location Pin (${event.location.name || 'Hyderabad'})`);
  }

  const replyText = await generateAIResponse(
    event.text || '',
    session.profile.name || 'there',
    event.location?.latitude != null ? event.location : null,
    from,
    session
  );

  // Schedule smart follow-up check-in if user asked about symptoms
  if (/(?:fever|crying|breath|vomit|rash|cough|headache|diarrhea|జ్వరం|ఏడుపు|బుఖార్|दर्द)/i.test(event.text || '')) {
    session.pendingFollowUp = {
      at: Date.now() + 3 * 60 * 60 * 1000,
      topic: 'symptoms',
    };
  }

  Store.appendHistory(session, 'assistant', redactPhi(replyText, session.profile?.name));
  await store.saveSession(from, session);

  // Deliver AI reply. receivedAt makes this the one path we time: onboarding
  // replies are deterministic and fast, and would flatter the percentiles.
  // For a voice note, show what we heard in original language and English translation:
  const heard = event.voiceTranscript
    ? `🎙️ _"${event.voiceTranscript.replace(/[_*]/g, '').slice(0, 300)}"_${event.voiceEnglish && event.voiceEnglish !== event.voiceTranscript ? `\n_(English: "${event.voiceEnglish.replace(/[_*]/g, '').slice(0, 300)}")_` : ''}\n\n`
    : '';
  await deliver(from, { kind: 'text', body: heard + replyText }, receivedAt);

  // Model 2 (TTS): answer a voice note with a voice note. Sent after the text so
  // the safety-critical reply never waits on speech synthesis; failures are
  // logged and swallowed — the user already has the text.
  if (event.wasVoiceNote) {
    try {
      metric('tts.attempt');
      const voice = await buildVoiceReply(replyText, session.profile.locale || locale);
      if (voice) {
        const upload = await cloudApi.uploadMediaBuffer(voice.buffer, voice.mimeType, voice.filename);
        if (upload?.ok && upload?.id) {
          await deliver(from, { kind: 'audio', id: upload.id });
          metric(`tts.${voice.provider}_success`);
          console.log(`[TTS] voice reply delivered to ${tag} via ${voice.provider} (${voice.lang})`);
        } else {
          metric('tts.upload_failed');
          console.warn(`[TTS] media upload failed for ${tag}: ${upload?.error || 'unknown'}`);
        }
      } else {
        metric('tts.unavailable');
      }
    } catch (err) {
      metric('tts.error');
      console.warn(`[TTS] voice reply error for ${tag}: ${err.message}`);
    }
  }

  // Offer feedback buttons for standard guidance (non-emergency)
  if (safety.riskLevel === 'low') {
    const fbPrompt =
      locale === 'te'
        ? {
            kind: 'buttons',
            body: 'ఈ సలహా మీకు ఉపయోగపడిందా?',
            buttons: [
              { id: onboarding.ONBOARDING_IDS.feedbackYes, title: 'సహాయపడింది 👍' },
              { id: SURVEY_IDS.start, title: 'సర్వే 📋' },
              { id: onboarding.ONBOARDING_IDS.optOut, title: 'ఆప్ట్ అవుట్ 🛑' },
            ],
          }
        : locale === 'hi'
        ? {
            kind: 'buttons',
            body: 'क्या यह जानकारी मददगार रही?',
            buttons: [
              { id: onboarding.ONBOARDING_IDS.feedbackYes, title: 'मददगार रही 👍' },
              { id: SURVEY_IDS.start, title: 'सर्वे 📋' },
              { id: onboarding.ONBOARDING_IDS.optOut, title: 'ऑप्ट आउट 🛑' },
            ],
          }
        : locale === 'ta'
        ? {
            kind: 'buttons',
            body: 'இந்த தகவல் பயனுள்ளதாக இருந்ததா?',
            buttons: [
              { id: onboarding.ONBOARDING_IDS.feedbackYes, title: 'பயனுள்ளது 👍' },
              { id: SURVEY_IDS.start, title: 'கருத்துக் கணிப்பு 📋' },
              { id: onboarding.ONBOARDING_IDS.optOut, title: 'விலகு 🛑' },
            ],
          }
        : locale === 'kn'
        ? {
            kind: 'buttons',
            body: 'ಈ ಮಾಹಿತಿ ನಿಮಗೆ ಉಪಯುಕ್ತವಾಗಿದೆಯೇ?',
            buttons: [
              { id: onboarding.ONBOARDING_IDS.feedbackYes, title: 'ಸಹಾಯವಾಯಿತು 👍' },
              { id: SURVEY_IDS.start, title: 'ಸರ್ವೇ 📋' },
              { id: onboarding.ONBOARDING_IDS.optOut, title: 'ಆಪ್ಟ್-ಔಟ್ 🛑' },
            ],
          }
        : locale === 'ml'
        ? {
            kind: 'buttons',
            body: 'ഈ നിർദ്ദേശം സഹായകരമായിരുന്നോ?',
            buttons: [
              { id: onboarding.ONBOARDING_IDS.feedbackYes, title: 'സഹായകരമായി 👍' },
              { id: SURVEY_IDS.start, title: 'സർവേ 📋' },
              { id: onboarding.ONBOARDING_IDS.optOut, title: 'ഒഴിവാക്കുക 🛑' },
            ],
          }
        : locale === 'mr'
        ? {
            kind: 'buttons',
            body: 'हे मार्गदर्शन उपयुक्त ठरले का?',
            buttons: [
              { id: onboarding.ONBOARDING_IDS.feedbackYes, title: 'मदत झाली 👍' },
              { id: SURVEY_IDS.start, title: 'सर्वेक्षण 📋' },
              { id: onboarding.ONBOARDING_IDS.optOut, title: 'ऑप्ट आउट 🛑' },
            ],
          }
        : locale === 'bn'
        ? {
            kind: 'buttons',
            body: 'এই পরামর্শটি কি সহায়ক ছিল?',
            buttons: [
              { id: onboarding.ONBOARDING_IDS.feedbackYes, title: 'সহায়ক ছিল 👍' },
              { id: SURVEY_IDS.start, title: 'সার্ভে 📋' },
              { id: onboarding.ONBOARDING_IDS.optOut, title: 'অপ্ট আউট 🛑' },
            ],
          }
        : locale === 'ar'
        ? {
            kind: 'buttons',
            body: 'هل كانت هذه الإرشادات مفيدة لك؟',
            buttons: [
              { id: onboarding.ONBOARDING_IDS.feedbackYes, title: 'مفيدة 👍' },
              { id: SURVEY_IDS.start, title: 'استطلاع 📋' },
              { id: onboarding.ONBOARDING_IDS.optOut, title: 'إلغاء 🛑' },
            ],
          }
        : locale === 'fr'
        ? {
            kind: 'buttons',
            body: 'Ces conseils vous ont-ils été utiles ?',
            buttons: [
              { id: onboarding.ONBOARDING_IDS.feedbackYes, title: 'Utile 👍' },
              { id: SURVEY_IDS.start, title: 'Enquête 📋' },
              { id: onboarding.ONBOARDING_IDS.optOut, title: 'Quitter 🛑' },
            ],
          }
        : locale === 'sw'
        ? {
            kind: 'buttons',
            body: 'Je, ushauri huu umekusaidia?',
            buttons: [
              { id: onboarding.ONBOARDING_IDS.feedbackYes, title: 'Umesaidia 👍' },
              { id: SURVEY_IDS.start, title: 'Utafiti 📋' },
              { id: onboarding.ONBOARDING_IDS.optOut, title: 'Ondoka 🛑' },
            ],
          }
        : locale === 'ha'
        ? {
            kind: 'buttons',
            body: 'Shin wannan shawarar ta taimaka?',
            buttons: [
              { id: onboarding.ONBOARDING_IDS.feedbackYes, title: 'Taimaka 👍' },
              { id: SURVEY_IDS.start, title: 'Bincike 📋' },
              { id: onboarding.ONBOARDING_IDS.optOut, title: 'Fita 🛑' },
            ],
          }
        : locale === 'yo'
        ? {
            kind: 'buttons',
            body: 'Ṣe itọsọna yii ṣe iranlọwọ?',
            buttons: [
              { id: onboarding.ONBOARDING_IDS.feedbackYes, title: 'Iranlọwọ 👍' },
              { id: SURVEY_IDS.start, title: 'Iwadii 📋' },
              { id: onboarding.ONBOARDING_IDS.optOut, title: 'Jade 🛑' },
            ],
          }
        : locale === 'am'
        ? {
            kind: 'buttons',
            body: 'ይህ መመሪያ ጠቅሞዎታል?',
            buttons: [
              { id: onboarding.ONBOARDING_IDS.feedbackYes, title: 'ረድቷል 👍' },
              { id: SURVEY_IDS.start, title: 'ጥናት 📋' },
              { id: onboarding.ONBOARDING_IDS.optOut, title: 'ውጣ 🛑' },
            ],
          }
        : locale === 'zu'
        ? {
            kind: 'buttons',
            body: 'Ingabe lesi siqondiso sibe wusizo?',
            buttons: [
              { id: onboarding.ONBOARDING_IDS.feedbackYes, title: 'Kusizile 👍' },
              { id: SURVEY_IDS.start, title: 'Inhlolovo 📋' },
              { id: onboarding.ONBOARDING_IDS.optOut, title: 'Phuma 🛑' },
            ],
          }
        : {
            kind: 'buttons',
            body: 'Was this guidance helpful?',
            buttons: [
              { id: onboarding.ONBOARDING_IDS.feedbackYes, title: 'Helpful 👍' },
              { id: SURVEY_IDS.start, title: 'Survey 📋' },
              { id: onboarding.ONBOARDING_IDS.optOut, title: 'Opt Out 🛑' },
            ],
          };
    await deliver(from, fbPrompt).catch(() => {});
  }
}

/**
 * The welcome tip sent the moment onboarding completes.
 *
 * Best-effort: a location the user skipped, or a weather API that is down,
 * degrades to the profile-only tip, and a hard failure is swallowed — the
 * user has already been told they are all set, and an error here must not
 * make that look like it failed.
 */
async function sendFirstTip(waId, session) {
  try {
    const loc = session.profile?.location;
    let climate = null;
    if (loc?.latitude != null && loc?.longitude != null) {
      climate = await fetchClimateIntelligence(loc.latitude, loc.longitude, loc.name || '');
    }
    await deliver(waId, { kind: 'text', body: composeFirstTip(session, climate) });
    // Decoration only, and only here: finishing setup is the one moment in
    // the flow with nothing clinical attached to it.
    const sticker = stickerFor('bloom');
    if (sticker) await deliver(waId, { kind: 'sticker', sticker }).catch(() => {});
  } catch (err) {
    console.warn('[first-tip] skipped:', err?.message);
  }
}

/**
 * Tally thumbs-up / need-more taps on the session.
 *
 * Counts only — never the question or the reply they refer to, so this stays
 * clear of the PHI the history cap and redaction exist to keep out.
 */
async function recordFeedback(waId, session, kind, options = {}) {
  const tally = session.feedback || { helpful: 0, needMore: 0, lastAt: null };
  tally[kind] = (tally[kind] || 0) + 1;
  tally.lastAt = new Date().toISOString();
  session.feedback = tally;
  await store.saveSession(waId, session);

  // Store de-identified aggregate feedback event for Analytics dashboard
  try {
    const subjectType = session.profile?.subjectType;
    const trimester = session.profile?.pregnancyTrimester;
    const cohort =
      subjectType === 'pregnant_person'
        ? (trimester ? `${trimester} Trimester` : '3rd Trimester')
        : subjectType === 'infant' || subjectType === 'child'
        ? 'Infants & Pediatric'
        : 'General Community';

    await store.recordFeedbackEvent({
      kind,
      rating: options.rating || (kind === 'helpful' ? 5 : 2),
      reason: options.reason || null,
      cohort,
      locale: session.profile?.locale || 'en',
      service: options.service || 'Clinical Triage',
      comment: options.comment ? redactPhi(String(options.comment)) : null,
    });
  } catch (err) {
    console.warn('[feedback] recordFeedbackEvent failed:', err.message);
  }
}

/**
 * Outbound delivery.
 *
 * Enforces the 24-hour customer service window: outside it, free-form text is
 * rejected by Meta (131047), so we send an approved template instead of
 * silently failing.
 */
async function deliver(to, message, receivedAt = null) {
  const session = await store.getSession(to);
  const now = Date.now();
  const windowOpen =
    (receivedAt && now - Number(receivedAt) < 24 * 3600 * 1000) ||
    Store.isWindowOpen(session, now);

  if (!windowOpen) {
    console.warn(`[deliver] 24h window closed for ${pseudonymize(to)} — template required`);
    metric('outbound.window_closed');
    const templateName = process.env.META_REENGAGEMENT_TEMPLATE;
    if (!templateName) {
      console.error('[deliver] META_REENGAGEMENT_TEMPLATE is not configured; cannot reach this user.');
      metric('outbound.failed');
      metric('outbound.fail.window_closed_no_template');
      return { ok: false, reason: 'window_closed_no_template' };
    }
    return cloudApi.sendTemplate(to, { name: templateName, languageCode: session.profile?.locale || 'en' });
  }

  const send = () => {
    switch (message.kind) {
      case 'buttons':
        return cloudApi.sendButtons(to, message);
      case 'list':
        return cloudApi.sendList(to, message);
      case 'location_request':
        return cloudApi.sendLocationRequest(to, message.body);
      case 'sticker':
        return cloudApi.sendSticker(to, message.sticker);
      case 'image':
        return cloudApi.sendImage(to, message.image);
      case 'audio':
        return cloudApi.sendAudio(to, message.audio || { id: message.id, link: message.link });
      case 'template':
        return cloudApi.sendTemplate(to, message);
      case 'text':
      default:
        return cloudApi.sendText(to, message.body, { previewUrl: Boolean(message.previewUrl) });
    }
  };

  // One funnel for every outbound message, so the dashboard's send-failure
  // rate cannot drift from reality as new message kinds are added.
  //
  // cloudApi does NOT throw on a rejected send — it resolves with
  // { ok: false, reason }. Counting only exceptions would report a permanent
  // 0% failure rate while every message was being refused, which is worse
  // than showing nothing at all.
  try {
    const result = await send();
    if (result && result.ok === false) {
      metric('outbound.failed');
      metric(`outbound.fail.${result.reason || 'unknown'}`);
    } else {
      metric('outbound.sent');
      metric(`outbound.kind.${message.kind || 'text'}`);
      if (receivedAt) observeLatency(Date.now() - receivedAt);
    }

    // Link live WhatsApp turn to the Zero-PHI Surveillance Dashboard
    if (store && typeof store.recordClinicalEvent === 'function' && message?.body) {
      store
        .getSession(to)
        .then(async (sess) => {
          const subjectType = sess?.profile?.subjectType || 'pregnant_person';
          const uniqueId = assignUniqueDayliId(to, subjectType);
          const zone = sess?.profile?.location?.name || 'Hyderabad';
          const lat = sess?.profile?.location?.latitude ?? 17.385;
          const lon = sess?.profile?.location?.longitude ?? 78.4867;
          const { nearest } = findNearestReadyLabourRoom(lat, lon);
          const cleanedReply = redactPhi(String(message.body).slice(0, 260), sess?.profile?.name);
          const history = Array.isArray(sess?.history) ? sess.history : [];
          const lastEntry = history[history.length - 1];
          if (!lastEntry || lastEntry.role !== 'assistant') {
            Store.appendHistory(sess, 'assistant', cleanedReply);
            await store.saveSession(to, sess);
          }
          const lastUserTurn = [...(sess.history || [])].reverse().find((h) => h.role === 'user');
          _clearClimateHealthCache();
          return store.recordClinicalEvent({
            uniqueId,
            zone,
            locale: sess?.profile?.locale || 'en',
            subjectType,
            subject:
              subjectType === 'pregnant_person'
                ? `Maternal (${sess?.profile?.pregnancyTrimester || 'Monitored'})`
                : subjectType === 'infant'
                ? `Infant (${sess?.profile?.childAgeMonths || 4}m)`
                : subjectType,
            type: 'WhatsApp Live Copilot Turn',
            userQuery: lastUserTurn?.content ? redactPhi(String(lastUserTurn.content).slice(0, 120), sess?.profile?.name) : 'Live WhatsApp Message',
            action: cleanedReply,
            hospital: nearest
              ? `${nearest.shortName} (${nearest.distanceKm} km)`
              : 'Petlaburj Govt Maternity',
            status: 'Delivered',
          });
        })
        .catch(() => {});
    }

    return result;
  } catch (err) {
    metric('outbound.failed');
    metric('outbound.fail.threw');
    throw err;
  }
}

// Webhook signature verification middleware
function verifySignature(req, res, next) {
  const signatureHeader = req.headers['x-hub-signature-256'];

  if (!APP_SECRET) {
    // Fails CLOSED. Startup already refuses this state unless explicitly overridden for dev.
    if (!ALLOW_UNVERIFIED_WEBHOOKS) {
      console.error('❌ [SECURITY] Rejecting webhook: no app secret configured.');
      return res.status(503).send('Webhook authentication unavailable');
    }
    return next();
  }

  if (!signatureHeader) {
    console.warn('❌ [SECURITY] Rejecting unsigned request. Missing x-hub-signature-256 header.');
    return res.status(401).send('Signature missing');
  }

  const elements = signatureHeader.split('=');
  const signature = elements[1];

  try {
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = crypto
      .createHmac('sha256', APP_SECRET)
      .update(req.rawBody)
      .digest();

    if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      console.error('❌ [SECURITY] Signature verification failed!');
      return res.status(403).send('Signature verification failed');
    }
    next();
  } catch (err) {
    console.error('❌ [SECURITY] Error validating signature:', err.message);
    return res.status(403).send('Signature validation error');
  }
}

app.post('/webhook', verifySignature, handleIncomingMessage);
app.post('/api/webhook', verifySignature, handleIncomingMessage);

// =================================================================
// PUBLIC / WEBSITE DISPATCH API: POST /api/send-alert
// =================================================================
app.post('/api/send-alert', async (req, res) => {
  const expectedKey = (process.env.DAYLI_INTERNAL_API_KEY || '').trim();
  if (!expectedKey) {
    return res.status(500).json({ success: false, error: 'DAYLI_INTERNAL_API_KEY is not configured on the server.' });
  }
  const providedKey = (req.headers['x-dayli-api-key'] || '').trim();
  if (providedKey !== expectedKey) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const body = req.body || {};
  const to = (body.to || '').replace(/[^\d]/g, '');
  if (!to) {
    return res.status(400).json({ success: false, error: 'Field "to" is required (phone number with country code).' });
  }

  try {
    let result;
    if (body.templateName) {
      result = await cloudApi.sendTemplate(to, {
        name: body.templateName,
        languageCode: body.languageCode || 'en',
      });
    } else {
      const alertText = body.message || [
        `🚨 *dayli Climate Warning Alert* for *${body.city || 'your area'}*`,
        '',
        `• Apparent Temp: *${body.feelsLike ?? '—'}°C* (Feels like)`,
        `• Air Quality Index: *${body.aqi ?? '—'}*`,
        `• UV Sun Index: *${body.uvIndex ?? '—'}*`,
        '',
        '⚠️ *Health Recommendation*:',
        'Restrict outdoor travel during peak heat, increase hydration (aim for 3L+), and keep infants in cool, ventilated rooms.',
        '',
        '_Reply "help" for a clinical action checklist._',
      ].join('\n');
      result = await deliver(to, { kind: 'text', body: alertText });
    }

    return res.status(result.ok !== false ? 200 : 502).json({
      success: result.ok !== false,
      recipient: to,
      messageId: result.messageId || null,
      error: result.error || (result.ok === false ? result.reason : null),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[send-alert] error:', err?.message);
    return res.status(500).json({ success: false, error: err?.message || 'Unknown dispatch error' });
  }
});

// =================================================================
// AURORA MODEL INGESTION & STATUS APIS (for Hyderabad & Regional Mesoscale)
// =================================================================

/**
 * Pushes a fresh Microsoft Aurora inference run into Dayli AI.
 * Validates model provenance, timestamp, bounding box coverage of Hyderabad,
 * and physical sanity of meteorological parameters.
 */
app.post('/internal/aurora/forecast', opsAuth, async (req, res) => {
  try {
    const payload = req.body;
    const result = await ingestAuroraForecast(payload);
    if (!result.ok) {
      return res.status(400).json({ success: false, error: result.error });
    }
    const status = await auroraStatus();
    console.log(`[AURORA FEED] New inference run ingested: ${status.model} (init: ${status.initTime})`);
    return res.status(200).json({ success: true, message: 'Aurora forecast successfully ingested', status });
  } catch (err) {
    console.error('[AURORA FEED] Ingestion error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Returns current Aurora feed health, freshness, and model initialization metadata.
 */
app.get('/ops/aurora', opsAuth, async (_req, res) => {
  const status = await auroraStatus();
  return res.status(200).json(status);
});

/**
 * Triggers daily 24-hour forecast broadcast to all consented active users (or single waId).
 */
app.post('/ops/daily-forecast/trigger', opsAuth, async (req, res) => {
  try {
    const { waId, force = true } = req.body || {};
    if (waId) {
      const sent = await sendMorningBriefToUser({ waId, store, cloudApi, fetchClimateIntelligence });
      return res.status(200).json({ success: true, waId, sent });
    }
    const result = await runMorningBriefs({ store, cloudApi, fetchClimateIntelligence, force });
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Triggers interactive multilingual MCQ feedback survey broadcast to all consented active users (or single waId).
 */
app.post('/ops/feedback-survey/trigger', opsAuth, async (req, res) => {
  try {
    const { waId, force = true } = req.body || {};
    if (waId) {
      const result = await sendFeedbackSurveyToUser({ waId, store, cloudApi, force });
      return res.status(200).json(result);
    }
    const result = await sendFeedbackSurveyToAllUsers({ store, cloudApi, force });
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// OPS DASHBOARD (authenticated)
// =================================================================

/**
 * HTTP Basic Auth against DAYLI_INTERNAL_API_KEY.
 *
 * Fails CLOSED: with no key configured the ops surface is unreachable rather
 * than public. The username is ignored — paste the key as the password.
 */
function opsAuth(req, res, next) {
  const expected = (process.env.DAYLI_INTERNAL_API_KEY || '').trim();
  if (!expected) {
    return res.status(503).json({ error: 'DAYLI_INTERNAL_API_KEY is not configured; /ops is disabled.' });
  }

  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  let provided = '';
  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    provided = decoded.slice(decoded.indexOf(':') + 1);
  }

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) {
    res.set('WWW-Authenticate', 'Basic realm="dayli ops", charset="UTF-8"');
    return res.status(401).json({ error: 'unauthorized' });
  }
  return next();
}

// ── Clinical Portal Authentication & Login Routes ─────────────────────
app.get('/login', (_req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'no-store');
  res.send(getLoginPageHtml());
});

app.post('/api/auth/login', handleLogin);
app.post('/api/auth/logout', handleLogout);

/**
 * Dayli AI — Executive Pitch for German Partner (Pregnant Women & Extreme Heat Impact).
 */
app.get('/pitch', requireDashboardAuth, (_req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'no-store');
  res.send(GERMAN_PITCH_HTML);
});

app.get('/api/climate-health/raw-sessions', requireDashboardAuth, async (_req, res) => {
  try {
    const allIds = (await store?.getAllUsers?.()) || (await store?.getActiveUsers?.()) || [];
    const sessions = [];
    for (const uid of allIds.slice(0, 200)) {
      const s = await store.getSession(uid);
      if (!s) continue;
      const subjectType = s.profile?.subjectType || 'unknown';
      const safeId = `wa_${assignUniqueDayliId(uid, subjectType)}`;
      sessions.push({
        waId: safeId,
        profile: {
          ...s.profile,
          name: '',
        },
        consent: s.consent,
        onboardingStep: s.onboardingStep,
        history: (s.history || []).map((h) => ({
          role: h.role,
          content: redactPhi(String(h.content || ''), s.profile?.name),
          at: h.at,
        })),
        lastInboundAt: s.lastInboundAt,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      });
    }
    const events = (await store?.getRecentClinicalEvents?.(30)) || [];
    res.set('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, sessions, events });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

let _lastRemoteSyncAt = 0;
async function syncRemoteWebhookStore(cookieHeader) {
  if (process.env.RENDER || process.env.VITEST) return;
  const now = Date.now();
  if (now - _lastRemoteSyncAt < 8000) return;
  _lastRemoteSyncAt = now;

  const remoteBase = process.env.REMOTE_WEBHOOK_URL || 'https://dayli-ai-whatsapp.onrender.com';
  try {
    const resp = await fetch(`${remoteBase}/api/climate-health/raw-sessions`, {
      headers: cookieHeader ? { Cookie: cookieHeader } : {},
      signal: AbortSignal.timeout(2500),
    });
    if (!resp.ok) return;
    const payload = await resp.json();
    if (Array.isArray(payload?.sessions)) {
      for (const rs of payload.sessions) {
        if (!rs?.waId) continue;
        const local = await store.getSession(rs.waId);
        if (!local?.lastInboundAt || (rs.lastInboundAt && rs.lastInboundAt > local.lastInboundAt)) {
          await store.saveSession(rs.waId, rs);
          _clearClimateHealthCache();
        }
      }
    }
  } catch {
    // Ignore remote sync timeouts silently
  }
}

app.get('/api/climate-health/data', requireDashboardAuth, async (req, res) => {
  try {
    await syncRemoteWebhookStore(req.headers.cookie);
    const data = await getClimateHealthSnapshot({ store, fetchClimateIntelligence });
    res.set('Cache-Control', 'no-store');
    return res.status(200).json(data);
  } catch (err) {
    console.error('[climate-health] data failed:', err.message);
    return res.status(500).json({ error: 'data_unavailable' });
  }
});

/**
 * Live WhatsApp Chatbot & Maternal Triage Bridge for real-time dashboard linkage.
 * Runs the inbound query through the real Dayli AI WhatsApp Chatbot engine
 * (deterministic safety evaluation + live Open-Meteo/Aurora climate context +
 * LLM inference + Nearest Ready Labour Room geospatial routing), updates the
 * session store, and optionally dispatches via Meta WhatsApp Cloud API if a
 * recipient phone number is provided.
 */
async function handleDashboardWhatsAppChat(req, res) {
  try {
    const body = req.body || {};
    const zone = body.zone || 'Almasguda';
    const locale = body.locale || 'te';
    const phone = body.phone || '';
    const message = String(body.text || body.message || body.userQuery || 'Heat exhaustion & labour room check').trim().slice(0, 320);

    let subjectType = body.subjectType || 'pregnant_person';
    let trimester = body.trimester || '3rd Trimester';
    let childAgeMonths = body.childAgeMonths ?? 4;

    if (body.cohort) {
      if (body.cohort === 'pregnant_3rd') {
        subjectType = 'pregnant_person';
        trimester = '3rd Trimester';
      } else if (body.cohort === 'pregnant_2nd') {
        subjectType = 'pregnant_person';
        trimester = '2nd Trimester';
      } else if (body.cohort === 'pregnant_1st') {
        subjectType = 'pregnant_person';
        trimester = '1st Trimester';
      } else if (body.cohort === 'infant') {
        subjectType = 'infant';
        childAgeMonths = 4;
      } else if (body.cohort === 'child') {
        subjectType = 'child';
        childAgeMonths = 24;
      } else if (body.cohort === 'general') {
        subjectType = 'general';
      }
    }

    const zoneCoords = {
      Almasguda: { lat: 17.3325, lon: 78.5372 },
      Charminar: { lat: 17.3616, lon: 78.4747 },
      Secunderabad: { lat: 17.4399, lon: 78.4983 },
      'Jubilee Hills': { lat: 17.4319, lon: 78.4073 },
      'HITEC City': { lat: 17.4435, lon: 78.3772 },
      Gachibowli: { lat: 17.4401, lon: 78.3489 },
      Kondapur: { lat: 17.4622, lon: 78.3568 },
      Kukatpally: { lat: 17.4947, lon: 78.3996 },
      'LB Nagar': { lat: 17.3457, lon: 78.5522 },
      Mehdipatnam: { lat: 17.3916, lon: 78.4385 },
    };
    const coords = zoneCoords[zone] || { lat: 17.385, lon: 78.4867 };
    const cleanPhone = String(phone || '').replace(/[^\d]/g, '');
    const waId = cleanPhone || `wa_live_${subjectType}_${zone.toLowerCase().replace(/\s+/g, '_')}`;
    const uniqueId = assignUniqueDayliId(waId, subjectType);
    const { nearest } = findNearestReadyLabourRoom(coords.lat, coords.lon);

    if (onboarding.isStopRequest(String(message || ''))) {
      await store.clearSession(waId);
      await store.recordOptOut(waId);
      metric('consent.declined');
      metric('user.opt_out');
      _clearClimateHealthCache();
      const replyObj = onboarding.stopConfirmation(locale);
      return res.status(200).json({
        ok: true,
        optedOut: true,
        uniqueId,
        zone,
        locale,
        subjectLabel: 'Opted Out (Data Erased)',
        userQuery: redactPhi(String(message)),
        nearestLabourRoom: nearest,
        copilotReply: replyObj.body,
        whatsappDelivery: { attempted: false, ok: true },
      });
    }

    metric('inbound.message');
    metric('inbound.type.text');

    // Prepare session with profile & location
    let session = await store.getSession(waId);
    session.consent = { granted: true, grantedAt: new Date().toISOString(), version: 'v2' };
    session.lastInboundAt = Date.now();
    session.profile = {
      ...session.profile,
      name: '',
      subjectType,
      pregnancyTrimester: subjectType === 'pregnant_person' ? trimester : null,
      childAgeMonths: subjectType === 'infant' || subjectType === 'child' ? Number(childAgeMonths) || 4 : null,
      locale,
      location: { name: zone, latitude: coords.lat, longitude: coords.lon, source: 'pin' },
    };

    const cleanedInbound = redactPhi(String(message));
    Store.appendHistory(session, 'user', cleanedInbound);

    const simSurvey = advanceSurvey(session, { text: message, replyId: body.replyId });
    if (simSurvey.handled) {
      if (simSurvey.completed && simSurvey.surveyData) {
        await recordFeedback(waId, session, simSurvey.surveyData.kind, {
          rating: simSurvey.surveyData.rating,
          reason: simSurvey.surveyData.reason || simSurvey.surveyData.value || null,
          service: simSurvey.surveyData.service,
          comment: simSurvey.surveyData.comment,
        });
        metric('survey.completed');
        metric(`survey.rating.${simSurvey.surveyData.rating}`);
      }
      await store.saveSession(waId, session);
      return res.status(200).json({
        ok: true,
        survey: true,
        uniqueId,
        zone,
        locale,
        subjectLabel: 'Feedback Survey',
        userQuery: redactPhi(String(message)),
        nearestLabourRoom: nearest,
        copilotReply: simSurvey.prompt?.body || (simSurvey.prompt?.kind === 'list' ? `${simSurvey.prompt.header}: ${simSurvey.prompt.body}` : 'Thank you for your feedback! 🌸'),
        surveyPrompt: simSurvey.prompt,
        whatsappDelivery: { attempted: false, ok: true },
      });
    }

    await store.saveSession(waId, session);

    // Invoke the real WhatsApp AI Chatbot pipeline
    let aiReply = null;
    try {
      aiReply = await generateAIResponse(
        String(message),
        'there',
        { latitude: coords.lat, longitude: coords.lon, name: zone },
        waId,
        session
      );
    } catch (aiErr) {
      console.warn('[dashboard-whatsapp-bridge] AI fallback triggered:', aiErr.message);
    }

    const fallbackByLocale = {
      te: `కొబ్బరి నీరు లేదా మజ్జిగ తాగండి, మధ్యాహ్నం 11–4 మధ్య ఎండలో బయటకు వెళ్లవద్దు. సమీప లేబర్ రూమ్: ${nearest?.shortName} (${nearest?.distanceKm} కి.మీ, ${nearest?.readyLabourRooms} సిద్ధంగా ఉన్నాయి).`,
      hi: `नारियल पानी या छाछ पिएं, दोपहर 11–4 बजे धूप से बचें। निकटतम तैयार लेबर रूम: ${nearest?.shortName} (${nearest?.distanceKm} किमी, ${nearest?.readyLabourRooms} रूम उपलब्ध)।`,
      en: `Sip tender coconut water or electrolyte fluids and rest indoors during peak heat (11 AM–4 PM). Nearest Ready Labour Room: ${nearest?.shortName} (${nearest?.distanceKm} km away, ${nearest?.readyLabourRooms} Ready Suites, Tel: ${nearest?.emergencyPhone}).`,
    };

    const copilotReply = redactPhi(aiReply || fallbackByLocale[locale] || fallbackByLocale.en);

    await store.updateSession(waId, (s) => {
      Store.appendHistory(s, 'assistant', copilotReply);
      return s;
    });

    // Optional live Meta WhatsApp Cloud API delivery when a phone number is specified
    let whatsappDelivery = { attempted: false, ok: false, messageId: null };
    if (cleanPhone && cleanPhone.length >= 10 && cloudApi.configured) {
      whatsappDelivery.attempted = true;
      try {
        const sendRes = await cloudApi.sendText(cleanPhone, copilotReply);
        whatsappDelivery.ok = sendRes?.ok !== false;
        whatsappDelivery.messageId = sendRes?.messageId || null;
        whatsappDelivery.error = sendRes?.error || sendRes?.reason || null;
      } catch (sendErr) {
        whatsappDelivery.error = sendErr.message;
      }
    }

    metric('outbound.sent');

    const subjectLabel =
      subjectType === 'pregnant_person'
        ? `Maternal (${trimester})`
        : subjectType === 'infant'
        ? `Infant (${childAgeMonths || 4}m)`
        : subjectType === 'child'
        ? 'Child (Pediatric)'
        : 'General Community';

    await store.recordClinicalEvent({
      uniqueId,
      zone,
      locale,
      subjectType,
      subject: subjectLabel,
      type: cleanPhone ? 'WhatsApp Cloud API Live Turn' : 'Live WhatsApp Chatbot Triage',
      userQuery: cleanedInbound,
      action: copilotReply,
      hospital: nearest ? `${nearest.shortName} (${nearest.distanceKm} km)` : 'Assigned Hospital',
      status: whatsappDelivery.ok ? 'Sent via WhatsApp API' : 'Routed & Logged',
    });

    _clearClimateHealthCache();
    return res.status(200).json({
      ok: true,
      uniqueId,
      zone,
      locale,
      subjectLabel,
      userQuery: cleanedInbound,
      nearestLabourRoom: nearest,
      copilotReply,
      whatsappDelivery,
    });
  } catch (err) {
    console.error('[simulate-chat] error:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

app.post('/api/climate-health/simulate-chat', requireDashboardAuth, handleDashboardWhatsAppChat);
app.post('/api/climate-health/simulate-turn', requireDashboardAuth, handleDashboardWhatsAppChat);
app.post('/api/whatsapp/chat', requireDashboardAuth, handleDashboardWhatsAppChat);

// 6-hour in-memory reply cache for Live Chat Observatory authentic AI turns
const _observatoryReplyCache = new Map();
const OBSERVATORY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

app.get('/api/climate-health/sim-chats', requireDashboardAuth, (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    ok: true,
    simulated: true,
    authenticAiReplies: true,
    count: SIMULATED_WOMEN_SCENARIOS.length,
    scenarios: getSimulatedWomenObservatory(),
  });
});

app.post('/api/climate-health/observatory/turn', requireDashboardAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const scenarioId = String(body.scenarioId || 'DYL-SIM-01');
    const turnIdx = Number(body.turnIdx ?? 1);
    const forceRefresh = body.forceRefresh === true;
    const scenario =
      SIMULATED_WOMEN_SCENARIOS.find((s) => s.id === scenarioId) || SIMULATED_WOMEN_SCENARIOS[0];
    const message = String(
      body.text || body.message || scenario.turns.find((t) => t.role === 'user')?.text || ''
    )
      .trim()
      .slice(0, 320);

    // Strip synthetic voice-note wrapper prefix so the chatbot receives clean spoken text
    const cleanPromptText = message.replace(/^🎙️\s*\[Voice Note[^\]]*\]:\s*"?|"?$/g, '').trim();

    const cacheKey = `${scenario.id}:${turnIdx}:${cleanPromptText}`;
    if (!forceRefresh) {
      const cached = _observatoryReplyCache.get(cacheKey);
      if (cached && Date.now() - cached.ts < OBSERVATORY_CACHE_TTL_MS) {
        return res.status(200).json({ ...cached.payload, cached: true });
      }
    }

    const { nearest } = findNearestReadyLabourRoom(scenario.lat, scenario.lon);
    const fallbackTurn =
      scenario.turns[turnIdx]?.text ||
      scenario.turns.find((t) => t.role === 'assistant')?.text ||
      `Stay hydrated in shade. Nearest Ready Labour Room: ${nearest?.shortName} (${nearest?.distanceKm} km).`;

    // Build prior multi-turn history so the 2nd turn in each card has authentic conversational context
    const priorHistory = Array.isArray(body.history)
      ? body.history.slice(-4).map((h) => ({
          role: h.role === 'assistant' ? 'assistant' : 'user',
          content: redactPhi(String(h.text || h.content || '')),
        }))
      : [];
    priorHistory.push({ role: 'user', content: redactPhi(cleanPromptText) });

    const firstName = scenario.displayName.split(' ')[0] || 'there';

    // Ephemeral session object passed to the real Dayli AI Chatbot pipeline (English enforced)
    const dryRunSession = {
      consent: { granted: true, grantedAt: new Date().toISOString(), version: 'v2' },
      lastInboundAt: Date.now(),
      history: priorHistory,
      profile: {
        name: firstName,
        subjectType: scenario.subjectType,
        pregnancyTrimester: scenario.trimester,
        childAgeMonths: scenario.childAgeMonths,
        locale: 'en',
        location: {
          name: scenario.zone,
          latitude: scenario.lat,
          longitude: scenario.lon,
          source: 'pin',
        },
      },
    };

    let aiReply = null;
    if (body.liveAi !== false) {
      try {
        aiReply = await generateAIResponse(
          `${cleanPromptText} (Please reply strictly in English)`,
          firstName,
          { latitude: scenario.lat, longitude: scenario.lon, name: scenario.zone },
          `obs_${scenario.id.toLowerCase()}`,
          dryRunSession
        );
      } catch (err) {
        console.warn('[observatory-turn] AI error, using safety fallback:', err.message);
      }
    }

    const copilotReply = redactPhi(aiReply || fallbackTurn);
    const payload = {
      ok: true,
      simulated: true,
      authenticAi: Boolean(aiReply),
      scenarioId: scenario.id,
      turnIdx,
      zone: scenario.zone,
      locale: 'en',
      userQuery: redactPhi(message),
      copilotReply,
      nearestHospital: nearest,
      mode: aiReply ? 'live_chatbot_engine' : 'safety_fallback',
    };

    _observatoryReplyCache.set(cacheKey, { ts: Date.now(), payload });
    return res.status(200).json(payload);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/ops/metrics', opsAuth, async (_req, res) => {
  try {
    const [users, rollups, aurora] = await Promise.all([
      userActivitySnapshot(store),
      readRollups(7),
      auroraStatus(),
    ]);
    res.set('Cache-Control', 'no-store');
    res.json({
      service: {
        name: 'dayli.ai Climate Health Copilot',
        version: '2.1.0',
        store: store ? store.label : 'initialising',
        safetyRules: `v${SAFETY_RULE_VERSION}`,
        cloudApi: cloudApi.configured ? 'configured' : 'not configured',
      },
      process: metricsSnapshot(),
      users,
      rollups,
      aurora,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[ops] metrics failed:', err.message);
    res.status(500).json({ error: 'metrics_unavailable' });
  }
});

app.get('/health', async (req, res) => {
  const aurora = await auroraStatus();
  res.json({
    status: 'ok',
    service: 'dayli.ai Climate Health Copilot',
    version: '2.1.0',
    timestamp: new Date().toISOString(),
    store: store ? store.label : 'initialising',
    safetyRules: `v${SAFETY_RULE_VERSION}`,
    aurora: {
      loaded: aurora.loaded,
      fresh: aurora.fresh,
      initTime: aurora.initTime || null,
    },
  });
});

app.get('/', (_req, res) => {
  // Never expose credentials here — this endpoint is public and unauthenticated.
  res.json({
    status: 'online',
    service: 'dayli.ai WhatsApp Cloud Engine',
    version: '2.1.0',
    config: {
      phoneNumberConfigured: Boolean(PHONE_NUMBER_ID),
      verifyTokenConfigured: Boolean(VERIFY_TOKEN),
      appSecretConfigured: Boolean(APP_SECRET),
      aiConfigured: Boolean(AI_API_KEY),
      store: store ? store.label : 'initialising',
      safetyRules: SAFETY_RULE_VERSION,
    },
  });
});

// =================================================================
// STARTUP
// =================================================================

store = await Store.create({ url: process.env.SESSION_STORE_URL });
initAuroraFeed(store);

// Initialize background BullMQ workers if Redis is available
const workers = await initWorkers(
  async (event) => {
    // Process queued inbound event with retry and error boundaries
    if (event && event.from) {
      await handleMessageEvent(event);
    }
  },
  async (reminderData) => {
    // Process scheduled proactive reminders
    if (reminderData?.to && reminderData?.body) {
      await deliver(reminderData.to, { kind: 'text', body: reminderData.body });
    }
  }
);

// ── Scheduled Smart Follow-up Check ──────────────────────────────
let followUpInterval = null;

function startFollowUpScheduler() {
  if (followUpInterval) clearInterval(followUpInterval);
  followUpInterval = setInterval(async () => {
    try {
      const activeUsers = await store.getActiveUsers();
      const now = Date.now();
      for (const waId of activeUsers) {
        const session = await store.getSession(waId);
        if (session?.pendingFollowUp && now >= session.pendingFollowUp.at) {
          const followUpLocale = session.profile?.locale || 'en';
          const who = onboarding.subjectNoun(
            session.profile?.subjectType || 'unknown',
            followUpLocale
          );
          delete session.pendingFollowUp;
          await store.saveSession(waId, session);

          if (Store.isWindowOpen(session)) {
            const msg =
              followUpLocale === 'te'
                ? `నమస్కారం — ${who} ఇప్పుడు ఎలా ఉన్నారో కనుక్కుందామని మెసేజ్ చేస్తున్నాను. ఏమైనా మార్పులు ఉన్నాయా లేదా సలహా కావాలా? 🌸`
                : followUpLocale === 'hi'
                ? `नमस्ते — मैं जानना चाहती थी कि अब ${who} की तबियत कैसी है। क्या आपको और किसी मार्गदर्शन की आवश्यकता है? 🌸`
                : `Hi there — just checking in to see how ${who} ${
                    who === 'you' ? 'are' : 'is'
                  } doing now. Please let me know if you need any more guidance or if anything changed! 🌸`;
            await deliver(waId, { kind: 'text', body: msg });
          }
        }
      }
    } catch (err) {
      console.warn('[follow-up] check error:', err?.message);
    }
  }, 5 * 60 * 1000);
}

function stopFollowUpScheduler() {
  if (followUpInterval) {
    clearInterval(followUpInterval);
    followUpInterval = null;
  }
}

// ── Aurora Climate Risk-Pulse Proactive Scheduler ──────────────────────
let _riskPulseInterval = null;
const riskAlertSentAt = new Map(); // waId -> Date string (IST calendar day)

function startRiskPulseScheduler({ intervalMs = 15 * 60 * 1000 } = {}) {
  if (_riskPulseInterval) return;
  _riskPulseInterval = setInterval(runRiskPulse, intervalMs);
  _riskPulseInterval.unref?.();
  console.log('[risk-pulse] Aurora climate risk-pulse scheduler started');
}

function stopRiskPulseScheduler() {
  if (_riskPulseInterval) {
    clearInterval(_riskPulseInterval);
    _riskPulseInterval = null;
  }
}

async function runRiskPulse() {
  // Only deliver during active daytime hours (06:00 to 20:00 IST) — never wake caregivers at night
  try {
    const istHourStr = new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone: 'Asia/Kolkata',
    }).format(new Date());
    const istHour = parseInt(istHourStr, 10);
    if (istHour < 6 || istHour >= 20) return;
  } catch (_) {
    // If timezone parsing fails, continue
  }

  let activeUsers = [];
  try {
    activeUsers = await store.getActiveUsers();
  } catch (err) {
    console.warn('[risk-pulse] could not load active users:', err.message);
    return;
  }

  const todayIST = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date());

  for (const waId of activeUsers) {
    try {
      const session = await store.getSession(waId);
      if (!session?.consent?.granted) continue;

      const loc = session.profile?.location;
      if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') continue;

      // Check if user already received a proactive risk alert today
      if (riskAlertSentAt.get(waId) === todayIST) continue;

      const forecast = await fetchAuroraForecast(loc.latitude, loc.longitude);
      if (!forecast || !forecast.risk?.shouldAlert) continue;

      const brief = await generateAuroraRiskBrief({
        forecast,
        profile: session.profile,
        cityName: loc.name || '',
      });
      if (!brief) continue;

      if (Store.isWindowOpen(session)) {
        const result = await deliver(waId, { kind: 'text', body: brief });
        if (result && result.ok !== false) {
          riskAlertSentAt.set(waId, todayIST);
          metric('risk_pulse.alert_sent');
          console.log(`[risk-pulse] Proactive alert delivered to ${pseudonymize(waId)} (${forecast.risk.heatLevel}/${forecast.risk.aqiLevel})`);
        }
      }
    } catch (err) {
      console.warn(`[risk-pulse] error processing ${pseudonymize(waId)}:`, err.message);
    }
  }
}

const server = app.listen(PORT, () => {
  console.log('=================================================================');
  console.log(`🚀 dayli.ai WhatsApp Business API server on port ${PORT}`);
  console.log('Webhook paths : GET/POST /webhook and /api/webhook');
  console.log('Health check  : GET /health and GET /');
  console.log(`Store         : ${store.label}`);
  console.log(`Safety rules  : v${SAFETY_RULE_VERSION}`);
  console.log(`Cloud API     : ${cloudApi.configured ? 'configured' : 'NOT configured — sends will fail'}`);
  console.log('=================================================================');

  hasFfmpeg().then((ff) => {
    const asr = isBhashiniConfigured() ? 'Bhashini → Gemini' : GEMINI_API_KEY ? 'Gemini' : 'DISABLED (no keys)';
    const tts = !ff
      ? 'DISABLED — ffmpeg not found (WhatsApp cannot play WAV/PCM)'
      : isBhashiniConfigured() ? 'Bhashini → Gemini TTS' : GEMINI_API_KEY ? 'Gemini TTS' : 'DISABLED (no keys)';
    console.log(`Voice ASR     : ${asr}`);
    console.log(`Voice replies : ${tts}`);
  });

  // Start background proactive schedulers
  startMorningBriefScheduler({ store, cloudApi, fetchClimateIntelligence });
  startFollowUpScheduler();
  startRiskPulseScheduler();
  startMetricsFlusher();

  // Ensure Microsoft Aurora atmospheric model feed is active and fresh for Hyderabad
  ensureFreshAuroraFeed().then((res) => {
    if (res.refreshed) {
      console.log(`[AURORA FEED] Initialized regional forecast run for Hyderabad (init: ${res.payload.init_time})`);
    } else {
      console.log(`[AURORA FEED] Active regional forecast loaded for Hyderabad (init: ${res.payload.init_time})`);
    }
  }).catch((err) => {
    console.warn('[AURORA FEED] Initialization warning:', err.message);
  });

  // Refresh Aurora regional feed every 6 hours (matching ECMWF cycle)
  setInterval(() => {
    ensureFreshAuroraFeed().catch((err) => {
      console.warn('[AURORA FEED] Periodic refresh failed:', err.message);
    });
  }, 6 * 3600 * 1000).unref?.();

  // Optional self-ping if KEEP_ALIVE_URL is explicitly configured
  const selfUrl = process.env.KEEP_ALIVE_URL;
  if (selfUrl && process.env.ENABLE_KEEPALIVE !== 'false') {
    setInterval(() => {
      fetch(`${selfUrl}/health`).catch(() => {});
    }, 4 * 60 * 1000).unref?.();
  }
});

// Graceful shutdown so in-flight replies finish and connections close cleanly
async function gracefulShutdown(signal) {
  console.log(`🛑 [shutdown] ${signal} received. Closing workers and connections...`);
  try {
    stopMorningBriefScheduler();
    stopFollowUpScheduler();
    stopRiskPulseScheduler();
    await stopMetricsFlusher();
    await closeWorkers();
    await closeQueues();
    await closeRedis();
  } catch (err) {
    console.warn('⚠️ [shutdown] Error during cleanup:', err.message);
  }

  server.close(() => {
    console.log('✅ [shutdown] HTTP server closed cleanly. Exiting process.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('⚠️ [shutdown] Forced exit after 10s timeout.');
    process.exit(0);
  }, 10000).unref();
}

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => gracefulShutdown(signal));
}

// A crash mid-webhook means Meta retries and the user gets a duplicate
// clinical reply. Log and stay up rather than dying on one bad event.
process.on('unhandledRejection', (reason) => {
  console.error('[fatal] unhandled rejection:', reason instanceof Error ? reason.message : reason);
});
process.on('uncaughtException', (err) => {
  console.error('[fatal] uncaught exception:', err?.message);
});
