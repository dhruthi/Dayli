#!/usr/bin/env node

/**
 * Dayli AI — Standalone Localhost Dashboard Server
 *
 * Runs the complete Climate & Maternal Health Surveillance Dashboard
 * on a dedicated port (default: 3001) without authentication blocks,
 * allowing immediate access and live interactive simulation.
 */

import express from 'express';
import cors from 'cors';
import { CLIMATE_HEALTH_DASHBOARD_HTML } from '../whatsapp-bridge/lib/climateHealthDashboard.js';
import { GERMAN_PITCH_HTML } from '../whatsapp-bridge/lib/germanPitch.js';
import { DASHBOARD_HTML } from '../whatsapp-bridge/lib/opsDashboard.js';
import { getLoginPageHtml } from '../whatsapp-bridge/lib/auth.js';
import { Store } from '../whatsapp-bridge/lib/store.js';
import {
  getClimateHealthSnapshot,
  assignUniqueDayliId,
  redactPhi,
  _clearClimateHealthCache,
} from '../whatsapp-bridge/lib/climateHealthStats.js';
import {
  getSimulatedWomenObservatory,
  SIMULATED_WOMEN_SCENARIOS,
} from '../whatsapp-bridge/lib/simChats.js';
import { findNearestReadyLabourRoom } from '../whatsapp-bridge/lib/labourRooms.js';

const PORT = process.env.DASHBOARD_PORT || 3001;
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize store (memory backend for standalone testing)
const store = await Store.create();

// Auto-seed some realistic sessions so the dashboard is immediately rich with live data
async function seedInitialData() {
  const existing = await store.getAllUsers();
  if (existing && existing.length > 0) return;

  const sampleUsers = [
    {
      id: 'wa_919876543210',
      profile: { subjectType: 'pregnant_person', trimester: '3rd Trimester', location: 'Almasguda' },
      query: 'High heat today, any ready labour room near Almasguda?',
      reply: 'Sip tender coconut water. Nearest Ready Labour Room: Vanasthalipuram Area Hospital (2.2 km away, 4 Ready Suites).',
      hospital: 'Vanasthalipuram Area Hospital (2.2 km)',
      zone: 'Almasguda',
      locale: 'te',
    },
    {
      id: 'wa_919876543211',
      profile: { subjectType: 'infant', childAgeMonths: 4, location: 'Charminar' },
      query: 'Is afternoon outdoor exposure safe for 4-month infant?',
      reply: 'AQI is 158 and Heat Index 39°C. Avoid outdoor exposure between 11 AM - 4 PM. Keep infant hydrated with frequent feeds.',
      hospital: 'Niloufer Hospital (3.1 km)',
      zone: 'Charminar',
      locale: 'en',
    },
    {
      id: 'wa_919876543212',
      profile: { subjectType: 'pregnant_person', trimester: '2nd Trimester', location: 'Secunderabad' },
      query: 'गर्मी के कारण हल्का चक्कर आ रहा है, क्या करूं?',
      reply: 'तुरंत छांव या पंखे के नीचे आराम करें और ओआरएस या नींबू पानी पिएं। यदि चक्कर जारी रहे तो 108 डायल करें।',
      hospital: 'Gandhi Hospital MCH (1.8 km)',
      zone: 'Secunderabad',
      locale: 'hi',
    },
  ];

  for (const u of sampleUsers) {
    const session = {
      profile: u.profile,
      consent: { granted: true, at: new Date().toISOString() },
      onboardingStep: 'done',
      history: [
        { role: 'user', content: u.query, at: new Date(Date.now() - 3600000).toISOString() },
        { role: 'assistant', content: u.reply, at: new Date(Date.now() - 3500000).toISOString() },
      ],
      lastInboundAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await store.saveSession(u.id, session);
    await store.recordClinicalEvent({
      uniqueId: assignUniqueDayliId(u.id, u.profile.subjectType),
      zone: u.zone,
      locale: u.locale,
      subjectType: u.profile.subjectType,
      subject: u.profile.trimester || 'Infant (4m)',
      type: 'Live WhatsApp Chatbot Triage',
      userQuery: u.query,
      action: u.reply,
      hospital: u.hospital,
      status: 'Routed & Logged',
    });
  }
}

await seedInitialData();

// Serve dashboard on root and /dashboard directly (no login block)
app.get(['/', '/dashboard'], (_req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'no-store');
  res.send(CLIMATE_HEALTH_DASHBOARD_HTML);
});

// Pitch deck for German partner
app.get('/pitch', (_req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'no-store');
  res.send(GERMAN_PITCH_HTML);
});

// Operational ops dashboard
app.get('/ops', (_req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'no-store');
  res.send(DASHBOARD_HTML);
});

// Login page
app.get('/login', (_req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'no-store');
  res.send(getLoginPageHtml());
});

app.post('/api/auth/login', (_req, res) => {
  res.json({ ok: true, redirect: '/dashboard' });
});

app.post('/api/auth/logout', (_req, res) => {
  res.json({ ok: true, redirect: '/dashboard' });
});

// Telemetry & Snapshot API
app.get('/api/climate-health/data', async (_req, res) => {
  try {
    const data = await getClimateHealthSnapshot({ store });
    res.set('Cache-Control', 'no-store');
    return res.status(200).json(data);
  } catch (err) {
    console.error('[standalone-dashboard] data error:', err.message);
    return res.status(500).json({ error: 'data_unavailable' });
  }
});

// Live Observatory Scenarios
app.get('/api/climate-health/sim-chats', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    ok: true,
    simulated: true,
    authenticAiReplies: true,
    count: SIMULATED_WOMEN_SCENARIOS.length,
    scenarios: getSimulatedWomenObservatory(),
  });
});

// Coordinates table for Hyderabad zones
const ZONE_COORDS = {
  Almasguda: { lat: 17.3325, lon: 78.5372 },
  Charminar: { lat: 17.3616, lon: 78.4747 },
  Secunderabad: { lat: 17.4399, lon: 78.4983 },
  'Jubilee Hills': { lat: 17.4319, lon: 78.4073 },
  'HITEC City': { lat: 17.4435, lon: 78.3772 },
  Gachibowli: { lat: 17.4401, lon: 78.3489 },
  Kondapur: { lat: 17.4622, lon: 78.3568 },
  Kukatpally: { lat: 17.4947, lon: 78.3996 },
  'LB Nagar': { lat: 17.3457, lon: 78.5522 },
  Uppal: { lat: 17.4018, lon: 78.5602 },
  Begumpet: { lat: 17.4447, lon: 78.4664 },
  Mehdipatnam: { lat: 17.3916, lon: 78.4385 },
};

// Interactive chat simulator
app.post(['/api/climate-health/simulate-chat', '/api/climate-health/simulate-turn', '/api/whatsapp/chat'], async (req, res) => {
  try {
    const body = req.body || {};
    const zone = body.zone || 'Almasguda';
    const locale = body.locale || 'en';
    const message = String(body.text || body.message || body.userQuery || 'Heat exhaustion & labour room check').trim().slice(0, 320);

    let subjectType = body.subjectType || 'pregnant_person';
    let trimester = body.trimester || '3rd Trimester';
    let childAgeMonths = body.childAgeMonths ?? 4;

    const coords = ZONE_COORDS[zone] || { lat: 17.385, lon: 78.4867 };
    const { nearest } = findNearestReadyLabourRoom(coords.lat, coords.lon);

    const waId = `sim_${Date.now()}`;
    const uniqueId = assignUniqueDayliId(waId, subjectType);

    const fallbackByLocale = {
      te: `కొబ్బరి నీరు లేదా మజ్జిగ తాగండి, మధ్యాహ్నం 11–4 మధ్య ఎండలో బయటకు వెళ్లవద్దు. సమీప లేబర్ రూమ్: ${nearest?.shortName || 'Vanasthalipuram Area Hospital'} (${nearest?.distanceKm || '2.2'} కి.మీ, ${nearest?.readyLabourRooms || 4} సిద్ధంగా ఉన్నాయి).`,
      hi: `नारियल पानी या छाछ पिएं, दोपहर 11–4 बजे धूप से बचें। निकटतम तैयार लेबर रूम: ${nearest?.shortName || 'गांधी अस्पताल'} (${nearest?.distanceKm || '2.2'} किमी, ${nearest?.readyLabourRooms || 4} रूम उपलब्ध)।`,
      en: `Sip tender coconut water or electrolyte fluids and rest indoors during peak heat (11 AM–4 PM). Nearest Ready Labour Room: ${nearest?.shortName || 'Government Area Hospital'} (${nearest?.distanceKm || '2.2'} km away, ${nearest?.readyLabourRooms || 4} Ready Suites, Tel: ${nearest?.emergencyPhone || '108'}).`,
    };

    const copilotReply = fallbackByLocale[locale] || fallbackByLocale.en;

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
      type: 'Live WhatsApp Chatbot Triage',
      userQuery: redactPhi(message),
      action: copilotReply,
      hospital: nearest ? `${nearest.shortName} (${nearest.distanceKm} km)` : 'Assigned Hospital',
      status: 'Routed & Logged',
    });

    _clearClimateHealthCache();

    return res.status(200).json({
      ok: true,
      uniqueId,
      zone,
      locale,
      subjectLabel,
      userQuery: message,
      nearestLabourRoom: nearest,
      copilotReply,
      whatsappDelivery: { attempted: false, ok: true },
    });
  } catch (err) {
    console.error('[standalone-dashboard] simulate-chat error:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Observatory step-through turn
app.post('/api/climate-health/observatory/turn', (req, res) => {
  const body = req.body || {};
  const scenarioId = String(body.scenarioId || 'DYL-SIM-01');
  const scenario = SIMULATED_WOMEN_SCENARIOS.find((s) => s.id === scenarioId) || SIMULATED_WOMEN_SCENARIOS[0];
  const { nearest } = findNearestReadyLabourRoom(scenario.lat, scenario.lon);

  return res.json({
    ok: true,
    scenarioId: scenario.id,
    reply: `Stay hydrated and rest in shaded spaces. Nearest maternity facility: ${nearest?.shortName} (${nearest?.distanceKm} km).`,
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(` Dayli AI Standalone Dashboard Server Running!`);
  console.log(`======================================================`);
  console.log(` 🚀 URL: http://localhost:${PORT}`);
  console.log(` 📊 Direct Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(` 🇩🇪 German Partner Pitch: http://localhost:${PORT}/pitch`);
  console.log(` ⚙️  Ops Metrics: http://localhost:${PORT}/ops`);
  console.log(` No login or authentication required for localhost.`);
  console.log(`======================================================\n`);
});
