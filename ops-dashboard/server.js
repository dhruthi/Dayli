// Dayli AI Ops Dashboard - standalone service on port 5001.
// Fetches data from the chatbot backend on port 3000 via x-dayli-api-key header.
// Both services share the same Docker network (or localhost in dev).

import express from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import {
  getMetrics,
  getAuroraStatus,
  getClimateHealthData,
  getClimateHealthSessions,
  getHealth,
  triggerMorningBriefs,
  triggerFeedbackSurvey,
} from './lib/fetchDayliOps.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = parseInt(process.env.DASH_PORT || '5001', 10);
const DASH_KEY = process.env.DASH_ACCESS_KEY || '';

const app = express();
app.use(express.json());

function dashAuth(req, res, next) {
  if (!DASH_KEY) return next();
  const provided =
    req.headers['x-dash-key'] ||
    (req.headers.authorization || '').replace(/^Bearer\s+/i, '') ||
    req.query.key;
  if (provided === DASH_KEY) return next();
  return res.status(401).json({ error: 'unauthorized' });
}

app.get('/api/metrics', dashAuth, async (_req, res) => {
  try {
    res.json(await getMetrics());
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.get('/api/aurora', dashAuth, async (_req, res) => {
  try {
    res.json(await getAuroraStatus());
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.get('/api/climate', dashAuth, async (_req, res) => {
  try {
    res.json(await getClimateHealthData());
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.get('/api/sessions', dashAuth, async (_req, res) => {
  try {
    res.json(await getClimateHealthSessions());
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.get('/api/health', dashAuth, async (_req, res) => {
  try {
    res.json(await getHealth());
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.post('/api/actions/morning-briefs', dashAuth, async (req, res) => {
  try {
    const result = await triggerMorningBriefs(req.body);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.post('/api/actions/feedback-survey', dashAuth, async (req, res) => {
  try {
    const result = await triggerFeedbackSurvey(req.body);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

const dashboardHtml = fs.readFileSync(path.join(__dirname, 'lib', 'dashboard.html'), 'utf8');

app.get('/', (_req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'no-store');
  res.send(dashboardHtml);
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'dayli-ops-dashboard', port: PORT });
});

const server = app.listen(PORT, () => {
  console.log(`[dayli-ops-dashboard] listening on :${PORT}`);
  console.log(`[dayli-ops-dashboard] backend → ${process.env.DAYLI_BACKEND_URL || 'http://localhost:3000'}`);
});

process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });
