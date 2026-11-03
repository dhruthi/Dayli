/**
 * lib/forecast5d.js
 *
 * 5-Day Location Forecasting Engine for Dayli AI.
 *
 * Everywhere: Open-Meteo 5-day forecast (temperature, UV, rain, wind).
 *
 * Hyderabad area: the forecast is additionally corrected with Microsoft Aurora
 * (lib/auroraFeed.js), run on real ECMWF initial conditions.
 *
 * How Aurora is blended (and why):
 *   Aurora outputs 6-hourly snapshots (00/06/12/18 UTC = 05:30/11:30/17:30/
 *   23:30 IST). Those miss the ~14:30 IST heat peak, so a raw "max of the
 *   snapshots" would UNDER-state the afternoon high — the number that matters
 *   most for infant heat safety. Instead, for each IST day we measure how far
 *   Aurora is from Open-Meteo at the exact snapshot times (the bias, Δ) and
 *   shift Open-Meteo's full-resolution daily max/min by Δ. Aurora sets the
 *   level; Open-Meteo's hourly curve keeps the peak.
 *
 *   Safety guard: if |Δ| exceeds AURORA_MAX_DISAGREEMENT_C (default 4°C) the
 *   two models disagree too much to trust either correction, so that day uses
 *   Open-Meteo alone and the disagreement is logged.
 *
 *   Aurora does not forecast rain or UV — those always come from Open-Meteo.
 */

import { getAuroraForecast, sampleAuroraPoint } from './auroraFeed.js';

const IST_OFFSET_MS = 5.5 * 3600 * 1000;
const AURORA_LABEL = 'Microsoft Aurora + Open-Meteo';
const maxDisagreement = () => parseFloat(process.env.AURORA_MAX_DISAGREEMENT_C || '4');

/**
 * Checks if coordinates are approximately within the Hyderabad greater metropolitan region.
 * @param {number} lat
 * @param {number} lon
 * @returns {boolean}
 */
export function isNearHyderabad(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number') return false;
  // Bounding box: ~17.1 to ~17.7 N, ~78.2 to ~78.7 E
  return lat >= 17.1 && lat <= 17.7 && lon >= 78.2 && lon <= 78.7;
}

/** UTC ISO → IST wall-clock parts. */
function toIst(iso) {
  const d = new Date(Date.parse(iso) + IST_OFFSET_MS).toISOString(); // "YYYY-MM-DDTHH:MM:SS.sssZ" in IST
  return { date: d.slice(0, 10), hourKey: d.slice(0, 13), minutes: parseInt(d.slice(14, 16), 10) };
}

/** Open-Meteo hourly temperature at an arbitrary instant (linear between hours). */
function omTempAt(hourly, iso) {
  if (!hourly?.time?.length) return null;
  const { hourKey, minutes } = toIst(iso);
  const i = hourly.time.findIndex((t) => t.startsWith(hourKey));
  if (i < 0) return null;
  const a = hourly.temperature_2m?.[i];
  const b = hourly.temperature_2m?.[i + 1];
  if (!Number.isFinite(a)) return null;
  if (!Number.isFinite(b) || minutes === 0) return a;
  return a + (b - a) * (minutes / 60);
}

const round1 = (v) => Math.round(v * 10) / 10;

function riskFor(maxT) {
  if (maxT >= 42) return 'extreme';
  if (maxT >= 38) return 'high';
  if (maxT >= 33) return 'caution';
  return 'normal';
}

/**
 * Fetches a 5-day weather and environmental forecast for any location.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {string} cityName
 * @param {{ now?: number }} [opts]
 * @returns {Promise<object|null>}
 */
export async function fetch5DayForecast(lat, lon, cityName = '', opts = {}) {
  if (typeof lat !== 'number' || typeof lon !== 'number' || Number.isNaN(lat) || Number.isNaN(lon)) return null;

  try {
    const wxUrl =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,uv_index_max,precipitation_probability_max,precipitation_sum,wind_speed_10m_max` +
      `&hourly=temperature_2m` +
      `&forecast_days=5` +
      `&timezone=Asia%2FKolkata`;

    const [wxRes, aurora] = await Promise.all([
      fetch(wxUrl, { signal: AbortSignal.timeout(8000) }).catch(() => null),
      getAuroraForecast(opts).catch(() => null),
    ]);
    const wxData = wxRes && wxRes.ok ? await wxRes.json().catch(() => null) : null;

    // Aurora series at the user's exact location (null outside the Aurora grid).
    const series = aurora ? sampleAuroraPoint(aurora, lat, lon) : null;
    const auroraByDate = new Map();
    for (const s of series || []) {
      const { date } = toIst(s.validTime);
      if (!auroraByDate.has(date)) auroraByDate.set(date, []);
      auroraByDate.get(date).push(s);
    }

    const daily = wxData?.daily || {};
    const days = [];

    if (daily.time?.length) {
      for (let i = 0; i < Math.min(daily.time.length, 5); i++) {
        const dateStr = daily.time[i];
        let maxT = daily.temperature_2m_max?.[i];
        let minT = daily.temperature_2m_min?.[i];
        let source = 'Open-Meteo';
        let auroraDelta = null;

        const samples = auroraByDate.get(dateStr) || [];
        const deltas = samples
          .map((s) => {
            const om = omTempAt(wxData.hourly, s.validTime);
            return om == null ? null : s.tempC - om;
          })
          .filter(Number.isFinite);

        if (deltas.length && Number.isFinite(maxT) && Number.isFinite(minT)) {
          const delta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
          if (Math.abs(delta) <= maxDisagreement()) {
            maxT = round1(maxT + delta);
            minT = round1(minT + delta);
            auroraDelta = round1(delta);
            source = AURORA_LABEL;
          } else {
            console.warn(`[forecast5d] Aurora/Open-Meteo disagree by ${delta.toFixed(1)}°C on ${dateStr} — using Open-Meteo`);
          }
        }

        days.push({
          date: dateStr,
          dayName: new Date(`${dateStr}T12:00:00+05:30`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' }),
          maxTemp: maxT,
          minTemp: minT,
          uvMax: daily.uv_index_max?.[i] ?? null,
          rainProb: daily.precipitation_probability_max?.[i] ?? 0,
          rainMm: daily.precipitation_sum?.[i] ?? 0,
          windKph: daily.wind_speed_10m_max?.[i] ?? null,
          riskLevel: riskFor(maxT),
          source,
          auroraDelta,
        });
      }
    } else if (auroraByDate.size) {
      // Open-Meteo is down: Aurora alone, full days only. Snapshots miss the
      // afternoon peak, so flag that the real high may be a little higher.
      for (const [dateStr, samples] of auroraByDate) {
        if (samples.length < 3 || days.length >= 5) continue;
        const temps = samples.map((s) => s.tempC);
        const maxT = Math.max(...temps);
        days.push({
          date: dateStr,
          dayName: new Date(`${dateStr}T12:00:00+05:30`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' }),
          maxTemp: maxT,
          minTemp: Math.min(...temps),
          uvMax: null,
          rainProb: null,
          rainMm: null,
          windKph: Math.max(...samples.map((s) => s.windKph)),
          riskLevel: riskFor(maxT),
          source: 'Microsoft Aurora (6-hourly)',
          auroraDelta: null,
          peakMayBeHigher: true,
        });
      }
    }

    const auroraUsed = days.some((d) => d.source.startsWith('Microsoft Aurora'));
    const hasHeatwaveStreak = days.filter((d) => d.riskLevel === 'extreme' || d.riskLevel === 'high').length >= 3;

    return {
      cityName: cityName || (isNearHyderabad(lat, lon) ? 'Hyderabad' : `${lat.toFixed(2)}, ${lon.toFixed(2)}`),
      lat,
      lon,
      isAuroraCovered: auroraUsed,
      aurora: auroraUsed ? { model: aurora.model, initTime: aurora.init_time } : null,
      hasHeatwaveStreak,
      days,
    };
  } catch (err) {
    console.error('[forecast5d] error:', err.message);
    return null;
  }
}
