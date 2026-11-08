/**
 * lib/auroraFeed.js
 *
 * AI weather model forecast feed for the Hyderabad area.
 *
 * Accepts forecasts from any of three real AI weather models:
 *   • Microsoft Aurora  (provenance: "aurora-inference")
 *   • ECMWF AIFS        (provenance: "aifs-inference")
 *   • Google WeatherNext (provenance: "weathernext-inference")
 *
 * Each model has its own runner in aurora-runner/. The runners push their
 * output here (POST /internal/aurora/forecast). This module validates,
 * persists and serves whichever forecast is freshest.
 *
 * Hard rules, because this drives health advice:
 *   • Only data with a recognised model provenance AND physically plausible
 *     values is accepted. Synthetic / demo trajectories are refused.
 *   • A forecast older than AURORA_MAX_AGE_HOURS (default 30h from model
 *     initialisation) is treated as absent — callers fall back to Open-Meteo.
 *   • Nothing here throws into the request path.
 *
 * Payload (schema_version 1):
 * {
 *   schema_version: 1,
 *   provenance: "aurora-inference" | "aifs-inference" | "weathernext-inference",
 *   model: "Aurora 0.25° Fine-Tuned",
 *   initial_conditions: "ECMWF IFS HRES open data",
 *   init_time: "2026-10-12T00:00:00Z",
 *   generated_at: "2026-10-12T03:41:00Z",
 *   grid: { lats: [18.25, ..., 16.75], lons: [77.75, ..., 79.25] },
 *   steps: [ { valid_time: "2026-10-12T06:00:00Z",
 *              t2m_c: [[...lons] ...lats], wind10m_kph: [[...]], msl_hpa?: [[...]] } ]
 * }
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FILE = path.resolve(__dirname, '../../aurora-runner/data/aurora_hyderabad_latest.json');
const STORE_KEY = 'aurora:hyderabad:latest';
const STORE_TTL_S = 3 * 24 * 3600;
const URL_CACHE_MS = 15 * 60 * 1000;

const maxAgeMs = () => parseFloat(process.env.AURORA_MAX_AGE_HOURS || '30') * 3600 * 1000;

let backend = null; // store.backend (Redis or memory)
let latest = null; // last accepted payload in this process
let urlCache = { at: 0, value: null };

/** Wire the durable store so a pushed forecast survives restarts / is shared across instances. */
export function initAuroraFeed(store) {
  backend = store?.backend || null;
}

/** Test hook. */
export function _resetAuroraFeed() {
  backend = null;
  latest = null;
  urlCache = { at: 0, value: null };
}

const ACCEPTED_PROVENANCES = new Set([
  'aurora-inference',
  'aifs-inference',
  'weathernext-inference',
]);

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

function checkMatrix(m, rows, cols, lo, hi) {
  if (!Array.isArray(m) || m.length !== rows) return false;
  return m.every((r) => Array.isArray(r) && r.length === cols && r.every((v) => isNum(v) && v >= lo && v <= hi));
}

/**
 * Validate a pushed payload. Rejects anything that is not genuine model output.
 * @returns {{ ok: true, value: object } | { ok: false, error: string }}
 */
export function validateAuroraPayload(p) {
  if (!p || typeof p !== 'object') return { ok: false, error: 'payload must be a JSON object' };
  if (p.schema_version !== 1) return { ok: false, error: 'schema_version must be 1' };
  if (!ACCEPTED_PROVENANCES.has(p.provenance)) {
    return { ok: false, error: `provenance must be one of: ${[...ACCEPTED_PROVENANCES].join(', ')} — synthetic/demo data is not accepted` };
  }
  const init = Date.parse(p.init_time);
  if (!Number.isFinite(init)) return { ok: false, error: 'init_time must be an ISO timestamp' };
  if (init > Date.now() + 6 * 3600 * 1000) return { ok: false, error: 'init_time is in the future' };

  const lats = p.grid?.lats;
  const lons = p.grid?.lons;
  if (!Array.isArray(lats) || lats.length < 2 || !lats.every(isNum)) return { ok: false, error: 'grid.lats invalid' };
  if (!Array.isArray(lons) || lons.length < 2 || !lons.every(isNum)) return { ok: false, error: 'grid.lons invalid' };
  // Must cover Hyderabad.
  const [latMin, latMax] = [Math.min(...lats), Math.max(...lats)];
  const [lonMin, lonMax] = [Math.min(...lons), Math.max(...lons)];
  if (!(latMin <= 17.2 && latMax >= 17.6 && lonMin <= 78.3 && lonMax >= 78.6)) {
    return { ok: false, error: 'grid does not cover the Hyderabad area' };
  }

  if (!Array.isArray(p.steps) || p.steps.length < 4) return { ok: false, error: 'need at least 4 forecast steps' };
  let prev = 0;
  for (const [i, s] of p.steps.entries()) {
    const t = Date.parse(s?.valid_time);
    if (!Number.isFinite(t) || t <= prev) return { ok: false, error: `steps[${i}].valid_time invalid or not increasing` };
    prev = t;
    // Plausible near-surface range. Wide enough for an all-India grid: at 0.25°
    // the box reaches the Himalayas, where 2m temperatures legitimately fall far
    // below the -5°C that a Deccan-only feed could assume. Still tight enough to
    // catch unit errors (Kelvin would land near 300) and corrupt data.
    if (!checkMatrix(s.t2m_c, lats.length, lons.length, -60, 60)) {
      return { ok: false, error: `steps[${i}].t2m_c missing, wrong shape, or implausible` };
    }
    if (!checkMatrix(s.wind10m_kph, lats.length, lons.length, 0, 250)) {
      return { ok: false, error: `steps[${i}].wind10m_kph missing, wrong shape, or implausible` };
    }
  }
  return { ok: true, value: p };
}

/** Accept a pushed forecast. */
export async function ingestAuroraForecast(payload) {
  const v = validateAuroraPayload(payload);
  if (!v.ok) return v;
  // Never let an older run replace a newer one (out-of-order pushes).
  const current = await loadRaw();
  if (current && Date.parse(current.init_time) > Date.parse(v.value.init_time)) {
    return { ok: false, error: 'a newer Aurora run is already loaded' };
  }
  latest = v.value;
  if (backend) await backend.set(STORE_KEY, v.value, STORE_TTL_S);
  return { ok: true, value: v.value };
}

async function loadFromUrl() {
  const url = process.env.AURORA_FORECAST_URL;
  if (!url) return null;
  if (Date.now() - urlCache.at < URL_CACHE_MS) return urlCache.value;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = res.ok ? await res.json() : null;
    const v = data ? validateAuroraPayload(data) : { ok: false };
    urlCache = { at: Date.now(), value: v.ok ? v.value : null };
  } catch {
    urlCache = { at: Date.now(), value: null };
  }
  return urlCache.value;
}

function loadFromFile() {
  if (process.env.NODE_ENV === 'test' && !process.env.AURORA_FORECAST_PATH) return null;
  const file = process.env.AURORA_FORECAST_PATH || DEFAULT_FILE;
  try {
    if (!fs.existsSync(file)) return null;
    const v = validateAuroraPayload(JSON.parse(fs.readFileSync(file, 'utf-8')));
    return v.ok ? v.value : null;
  } catch {
    return null;
  }
}

/** Newest valid payload from any source, ignoring freshness. */
async function loadRaw() {
  const candidates = [latest];
  if (backend) {
    try { candidates.push(await backend.get(STORE_KEY)); } catch { /* ignore */ }
  }
  candidates.push(await loadFromUrl(), loadFromFile());
  return candidates
    .filter(Boolean)
    .sort((a, b) => Date.parse(b.init_time) - Date.parse(a.init_time))[0] || null;
}

/**
 * The current Aurora forecast, or null if none is loaded or it is stale.
 * @param {{ now?: number }} [opts]
 */
export async function getAuroraForecast({ now = Date.now() } = {}) {
  const f = await loadRaw();
  if (!f) return null;
  if (now - Date.parse(f.init_time) > maxAgeMs()) return null;
  return f;
}

/** Bilinear interpolation of a lats×lons matrix at (lat, lon). */
function bilinear(m, lats, lons, lat, lon) {
  const idx = (arr, v) => {
    // arr may be ascending or descending
    for (let i = 0; i < arr.length - 1; i++) {
      const a = arr[i], b = arr[i + 1];
      if ((v - a) * (v - b) <= 0) return { i, f: a === b ? 0 : (v - a) / (b - a) };
    }
    return null;
  };
  const y = idx(lats, lat);
  const x = idx(lons, lon);
  if (!y || !x) return null;
  const q11 = m[y.i][x.i], q12 = m[y.i][x.i + 1];
  const q21 = m[y.i + 1][x.i], q22 = m[y.i + 1][x.i + 1];
  const top = q11 + (q12 - q11) * x.f;
  const bot = q21 + (q22 - q21) * x.f;
  return top + (bot - top) * y.f;
}

/**
 * Aurora time series at a point. Null if the point is outside the grid.
 * @returns {Array<{ validTime: string, tempC: number, windKph: number }>|null}
 */
export function sampleAuroraPoint(forecast, lat, lon) {
  if (!forecast || !isNum(lat) || !isNum(lon)) return null;
  const { lats, lons } = forecast.grid;
  const out = [];
  for (const s of forecast.steps) {
    const t = bilinear(s.t2m_c, lats, lons, lat, lon);
    const w = bilinear(s.wind10m_kph, lats, lons, lat, lon);
    if (t == null || w == null) return null;
    out.push({ validTime: s.valid_time, tempC: Math.round(t * 10) / 10, windKph: Math.round(w * 10) / 10 });
  }
  return out;
}

/** Health/ops summary. */
export async function auroraStatus({ now = Date.now() } = {}) {
  const f = await loadRaw();
  if (!f) return { loaded: false, fresh: false };
  const ageH = (now - Date.parse(f.init_time)) / 3600000;
  return {
    loaded: true,
    fresh: ageH * 3600 * 1000 <= maxAgeMs(),
    model: f.model,
    initialConditions: f.initial_conditions,
    initTime: f.init_time,
    generatedAt: f.generated_at,
    ageHours: Math.round(ageH * 10) / 10,
    steps: f.steps.length,
    lastValidTime: f.steps[f.steps.length - 1].valid_time,
  };
}

