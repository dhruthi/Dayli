/**
 * HTTP client for the Dayli AI chatbot backend's /ops/* endpoints.
 *
 * Mirrors the BO Companion pattern: the dashboard and chatbot share the same
 * machine (or Docker network), so all calls go over localhost with a shared
 * API key in the x-dayli-api-key header.
 *
 * Connection is two env vars:
 *   DAYLI_BACKEND_URL   = http://localhost:3000 (or http://app:3000 in Docker)
 *   DAYLI_BACKEND_KEY   = same value as the backend's DAYLI_INTERNAL_API_KEY
 */

const BACKEND_URL = (process.env.DAYLI_BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
const BACKEND_KEY = process.env.DAYLI_BACKEND_KEY || '';

async function fetchDayliOps(path, { method = 'GET', body, timeoutMs = 10000 } = {}) {
  const url = `${BACKEND_URL}${path}`;
  const headers = {
    'x-dayli-api-key': BACKEND_KEY,
    'accept': 'application/json',
  };
  const opts = { method, headers, signal: AbortSignal.timeout(timeoutMs) };

  if (body) {
    headers['content-type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function getMetrics() {
  return fetchDayliOps('/ops/metrics');
}

export async function getAuroraStatus() {
  return fetchDayliOps('/ops/aurora');
}

export async function getClimateHealthData() {
  return fetchDayliOps('/ops/climate-health/data');
}

export async function getClimateHealthSessions() {
  return fetchDayliOps('/ops/climate-health/sessions');
}

export async function getHealth() {
  return fetchDayliOps('/health');
}

export async function triggerMorningBriefs({ waId, force = true } = {}) {
  return fetchDayliOps('/ops/daily-forecast/trigger', {
    method: 'POST',
    body: { waId, force },
  });
}

export async function triggerFeedbackSurvey({ waId, force = true } = {}) {
  return fetchDayliOps('/ops/feedback-survey/trigger', {
    method: 'POST',
    body: { waId, force },
  });
}
