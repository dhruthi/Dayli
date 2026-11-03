/**
 * lib/forecast.js
 *
 * Aurora-style 24-hour climate health forecast.
 *
 * Data source: Open-Meteo forecast API — same provider as current weather,
 * zero additional API keys. Open-Meteo's "best match" model blends ECMWF,
 * GFS and regional NWP grids, giving high resolution for temperature,
 * humidity, wet-bulb temperature, and AQI.
 *
 * Hyderabad Metropolitan Area:
 * Blends Microsoft Aurora foundation model forecasts initialized from ECMWF
 * to bias-correct peak temperature curves.
 *
 * Capabilities:
 *   • True rolling 24-hour temporal horizon from the current moment
 *   • Sense diurnal temperature swings (ΔT = max - min, heating rate)
 *   • Pinpoint peak heat stress windows (start hour, peak hour, end hour)
 *   • Detect precipitation / thunderstorm onset and probabilities
 *   • Hour-by-hour AQI trend to alert before pollution peaks occur
 *   • Wet-bulb temperature — critical metric for infant and maternal heat stress
 *   • Multilingual summary and tailored clinical action recommendations
 */

import { isNearHyderabad } from './forecast5d.js';
import { getAuroraForecast, sampleAuroraPoint } from './auroraFeed.js';

const FORECAST_CACHE = new Map(); // key: "lat,lon" -> { data, ts }
const FORECAST_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const IST_OFFSET_MS = 5.5 * 3600 * 1000;

/**
 * Clear the in-memory forecast cache (useful for tests).
 */
export function clearForecastCache() {
  FORECAST_CACHE.clear();
}

/**
 * Format ISO datetime string to Indian Standard Time (IST) 12-hour format (e.g. "2:30 PM").
 * @param {string} isoStr
 * @returns {string}
 */
export function formatIstTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return String(isoStr);
  return d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

/**
 * Classify heat stress risk from apparent temperature and wet-bulb temperature.
 *
 * @param {number|null} feelsLike
 * @param {number|null} wetBulb
 * @returns {{ level: 'extreme'|'high'|'moderate'|'normal', label: string }}
 */
export function classifyHeatRisk(feelsLike, wetBulb) {
  // Wet-bulb 35°C is the physiological threshold for humans.
  // Vulnerable groups (infants under 12m, pregnant women) face danger earlier at ~32°C.
  if ((typeof wetBulb === 'number' && wetBulb >= 33) || (typeof feelsLike === 'number' && feelsLike >= 45)) {
    return {
      level: 'extreme',
      label: '🚨 EXTREME: Heat stroke risk — stay indoors with fan/cooler, drink fluids every 20 min',
    };
  }
  if ((typeof wetBulb === 'number' && wetBulb >= 28) || (typeof feelsLike === 'number' && feelsLike >= 38)) {
    return {
      level: 'high',
      label: '⚠️ HIGH HEAT STRESS: Limit time outdoors, keep infants and pregnant women indoors 11 AM–5 PM',
    };
  }
  if (typeof feelsLike === 'number' && feelsLike >= 33) {
    return {
      level: 'moderate',
      label: '☀️ MODERATE: Stay hydrated, avoid direct sun exposure 12–4 PM',
    };
  }
  return { level: 'normal', label: 'Normal conditions expected' };
}

/**
 * Classify air quality risk (US AQI scale).
 *
 * @param {number|null} aqi
 * @returns {{ level: 'hazardous'|'unhealthy'|'moderate'|'good'|'unknown', label: string }}
 */
export function classifyAQIRisk(aqi) {
  if (typeof aqi !== 'number' || isNaN(aqi)) {
    return { level: 'unknown', label: 'AQI data unavailable' };
  }
  if (aqi > 200) {
    return {
      level: 'hazardous',
      label: '🚨 HAZARDOUS AIR: Keep windows closed, avoid any outdoor exposure for children and pregnant women',
    };
  }
  if (aqi > 150) {
    return {
      level: 'unhealthy',
      label: '⚠️ UNHEALTHY AIR: Sensitive groups (infants, pregnant) should stay indoors',
    };
  }
  if (aqi > 100) {
    return {
      level: 'moderate',
      label: '🌫️ MODERATE AQI: Limit vigorous outdoor activity for children',
    };
  }
  return { level: 'good', label: 'Air quality is acceptable' };
}

/**
 * Build a compact forecast summary string for the AI context block.
 *
 * @param {object} params
 * @returns {string}
 */
export function buildForecastSummary({
  peakTemp,
  peakFeels,
  peakWetBulb,
  peakUV,
  peakAQI,
  peakTempHour,
  peakAQIHour,
  heatRisk,
  aqiRisk,
}) {
  const timeLabel = peakTempHour
    ? ` (peaks around ${formatIstTime(peakTempHour)})`
    : '';

  const aqiTime = peakAQIHour
    ? ` (worst around ${formatIstTime(peakAQIHour)})`
    : '';

  return [
    `• Peak temperature today: ${peakTemp ?? 'N/A'}°C (feels like ${peakFeels ?? 'N/A'}°C)${timeLabel}`,
    `• Wet-bulb temperature: ${peakWetBulb ?? 'N/A'}°C`,
    `• Peak UV index: ${peakUV ?? 'N/A'}/11`,
    `• Peak AQI (US): ${peakAQI ?? 'N/A'}${aqiTime}`,
    `• Heat risk: ${heatRisk?.label || 'Normal'}`,
    `• Air quality: ${aqiRisk?.label || 'Acceptable'}`,
  ].join('\n');
}

/**
 * Analyzes rolling 24-hour weather shifts across consecutive hourly points.
 *
 * @param {object} params
 * @param {string[]} params.hours - 24 ISO timestamp strings
 * @param {number[]} params.temps - 24 temperature values
 * @param {number[]} params.feelsLike - 24 apparent temperatures
 * @param {number[]} params.wetBulbs - 24 wet-bulb temperatures
 * @param {number[]} params.uvIndices - 24 UV indices
 * @param {number[]} params.rainProbs - 24 precipitation probabilities (%)
 * @param {number[]} params.aqiValues - 24 AQI values
 * @param {boolean} [params.auroraApplied]
 * @returns {object} Detailed shift analysis and narrative summary
 */
export function analyzeRolling24HourChanges({
  hours = [],
  temps = [],
  feelsLike = [],
  wetBulbs = [],
  uvIndices = [],
  rainProbs = [],
  aqiValues = [],
  auroraApplied = false,
}) {
  if (!hours.length || !temps.length) {
    return {
      hasData: false,
      summaryText: 'Insufficient hourly data for 24-hour shift sensing.',
    };
  }

  const currentTemp = temps[0] != null ? Math.round(temps[0] * 10) / 10 : null;
  const currentFeels = feelsLike[0] != null ? Math.round(feelsLike[0] * 10) / 10 : currentTemp;
  const currentAQI = aqiValues[0] != null ? Math.round(aqiValues[0]) : null;

  const validTemps = temps.filter(Number.isFinite);
  const maxTemp = validTemps.length ? Math.max(...validTemps) : currentTemp;
  const maxTempIdx = maxTemp !== null ? temps.indexOf(maxTemp) : -1;
  const maxTempHour = maxTempIdx >= 0 ? hours[maxTempIdx] : null;

  const minTemp = validTemps.length ? Math.min(...validTemps) : currentTemp;
  const minTempIdx = minTemp !== null ? temps.indexOf(minTemp) : -1;
  const minTempHour = minTempIdx >= 0 ? hours[minTempIdx] : null;

  const tempSwing = maxTemp != null && minTemp != null ? Math.round((maxTemp - minTemp) * 10) / 10 : 0;
  const tempRise = maxTemp != null && currentTemp != null ? Math.round((maxTemp - currentTemp) * 10) / 10 : 0;

  // Peak heat window detection (hours where feels-like >= 35°C or temp >= 33°C)
  const heatIndices = [];
  feelsLike.forEach((fl, idx) => {
    if (fl >= 35 || (temps[idx] != null && temps[idx] >= 33)) {
      heatIndices.push(idx);
    }
  });

  const hasPeakHeat = heatIndices.length > 0;
  let heatStartHour = null;
  let heatEndHour = null;

  if (hasPeakHeat) {
    if (maxTempIdx >= 0 && heatIndices.includes(maxTempIdx)) {
      let start = maxTempIdx;
      while (start > 0 && heatIndices.includes(start - 1)) {
        start--;
      }
      let end = maxTempIdx;
      while (end < hours.length - 1 && heatIndices.includes(end + 1)) {
        end++;
      }
      heatStartHour = hours[start];
      heatEndHour = hours[end];
    } else {
      heatStartHour = hours[heatIndices[0]];
      heatEndHour = hours[heatIndices[heatIndices.length - 1]];
    }
  }

  const peakHeatWindow = {
    hasPeakHeat,
    startHour: heatStartHour,
    endHour: heatEndHour,
    peakHour: maxTempHour,
    peakTemp: maxTemp,
    peakFeels: maxTempIdx >= 0 ? (feelsLike[maxTempIdx] ?? maxTemp) : maxTemp,
  };

  // Rain / precipitation onset detection
  const validRainProbs = rainProbs.filter(Number.isFinite);
  const maxRainProb = validRainProbs.length ? Math.max(...validRainProbs) : 0;
  const rainExpected = maxRainProb >= 35;
  const rainStartIdx = rainProbs.findIndex((p) => p >= 35);
  const rainStartHour = rainStartIdx >= 0 ? hours[rainStartIdx] : null;
  const rainPeakIdx = validRainProbs.length ? rainProbs.indexOf(maxRainProb) : -1;
  const rainPeakHour = rainPeakIdx >= 0 ? hours[rainPeakIdx] : null;

  // Air quality trend
  const validAQIs = aqiValues.filter(Number.isFinite);
  const maxAQI = validAQIs.length ? Math.max(...validAQIs) : currentAQI;
  const maxAQIIdx = maxAQI !== null ? aqiValues.indexOf(maxAQI) : -1;
  const maxAQIHour = maxAQIIdx >= 0 ? hours[maxAQIIdx] : null;
  const aqiWorsens = maxAQI != null && currentAQI != null && (maxAQI - currentAQI >= 25) && maxAQI > 80;

  // Maximum wet-bulb & UV
  const validWetBulbs = wetBulbs.filter(Number.isFinite);
  const maxWetBulb = validWetBulbs.length ? Math.max(...validWetBulbs) : null;
  const validUVs = uvIndices.filter(Number.isFinite);
  const maxUV = validUVs.length ? Math.max(...validUVs) : null;

  // Narrative summary lines for 24h shifts
  const narrativeLines = [];

  // 1. Temperature trajectory
  if (currentTemp != null && maxTemp != null && minTemp != null) {
    let tLine = `• Temperature trajectory: currently ${currentTemp}°C`;
    if (tempRise > 1.5 && maxTempHour) {
      tLine += `, climbing to a peak of ${maxTemp}°C around ${formatIstTime(maxTempHour)} (+${tempRise}°C rise)`;
    } else {
      tLine += `, peaking at ${maxTemp}°C`;
    }
    if (minTempHour) {
      tLine += `, then dropping to ${minTemp}°C around ${formatIstTime(minTempHour)} (net 24h swing: ${tempSwing}°C)`;
    }
    narrativeLines.push(tLine);
  }

  // 2. Heat window
  if (hasPeakHeat && peakHeatWindow.startHour && peakHeatWindow.endHour) {
    narrativeLines.push(
      `• High heat window: ${formatIstTime(peakHeatWindow.startHour)} to ${formatIstTime(peakHeatWindow.endHour)} (feels like up to ${peakHeatWindow.peakFeels}°C)`
    );
  }

  // 3. Rain shift
  if (rainExpected && rainStartHour) {
    narrativeLines.push(
      `• Rain / Storm shift: showers expected starting around ${formatIstTime(rainStartHour)} (peak rain chance: ${maxRainProb}% around ${formatIstTime(rainPeakHour)})`
    );
  } else {
    narrativeLines.push(`• Rain risk: minimal rain expected in the next 24 hours (peak chance: ${maxRainProb}%)`);
  }

  // 4. Air quality shift
  if (maxAQI != null) {
    const aqiClass = classifyAQIRisk(maxAQI);
    let aLine = `• Air quality shift: currently AQI ${currentAQI ?? 'N/A'}`;
    if (aqiWorsens && maxAQIHour) {
      aLine += `, rising to peak ${maxAQI} (${aqiClass.level}) around ${formatIstTime(maxAQIHour)}`;
    } else {
      aLine += `, peaking at AQI ${maxAQI} (${aqiClass.level})`;
    }
    narrativeLines.push(aLine);
  }

  if (auroraApplied) {
    narrativeLines.push(`• Atmospheric modeling: Microsoft Aurora ECMWF bias-corrected (Hyderabad region)`);
  }

  return {
    hasData: true,
    auroraApplied,
    current: {
      temperature: currentTemp,
      feelsLike: currentFeels,
      aqi: currentAQI,
    },
    temperature: {
      current: currentTemp,
      max: maxTemp,
      maxHour: maxTempHour,
      min: minTemp,
      minHour: minTempHour,
      swing: tempSwing,
      riseFromCurrent: tempRise,
    },
    heatWindow: peakHeatWindow,
    rain: {
      expected: rainExpected,
      maxProb: maxRainProb,
      startHour: rainStartHour,
      peakHour: rainPeakHour,
    },
    aqi: {
      current: currentAQI,
      peak: maxAQI,
      peakHour: maxAQIHour,
      worsens: aqiWorsens,
      riskLevel: classifyAQIRisk(maxAQI).level,
    },
    wetBulb: {
      max: maxWetBulb,
    },
    uv: {
      max: maxUV,
    },
    summaryText: narrativeLines.join('\n'),
  };
}

/**
 * Fetch rolling 24-hour hourly forecast from Open-Meteo with clinical risk derivation.
 * Automatically blends Microsoft Aurora model outputs for Hyderabad metropolitan locations.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {object} [opts]
 * @returns {Promise<object|null>} Structured forecast object, or null on failure
 */
export async function fetchAuroraForecast(lat, lon, opts = {}) {
  if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
    return null;
  }

  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = FORECAST_CACHE.get(key);
  if (cached && Date.now() - cached.ts < FORECAST_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    // Request 2 forecast days (48 hours) to ensure a full rolling 24-hour window from the current moment
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,` +
      `wet_bulb_temperature_2m,uv_index,wind_speed_10m,precipitation_probability` +
      `&daily=temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_sum` +
      `&forecast_days=2` +
      `&timezone=Asia%2FKolkata`;

    const aqiUrl =
      `https://air-quality-api.open-meteo.com/v1/air-quality` +
      `?latitude=${lat}&longitude=${lon}` +
      `&hourly=pm2_5,pm10,us_aqi` +
      `&forecast_days=2` +
      `&timezone=Asia%2FKolkata`;

    const isHyd = isNearHyderabad(lat, lon);

    const [wxRes, aqRes, aurora] = await Promise.all([
      fetch(url, { signal: AbortSignal.timeout(8000) }),
      fetch(aqiUrl, { signal: AbortSignal.timeout(8000) }).catch(() => null),
      isHyd ? getAuroraForecast(opts).catch(() => null) : Promise.resolve(null),
    ]);

    if (!wxRes || !wxRes.ok) {
      console.warn(`[forecast] Open-Meteo weather error ${wxRes?.status}`);
      return null;
    }

    const wxData = await wxRes.json();
    const aqData = aqRes && aqRes.ok ? await aqRes.json().catch(() => null) : null;

    const allHours = wxData.hourly?.time ?? [];
    let allTemps = (wxData.hourly?.temperature_2m ?? []).slice();
    const allFeelsLike = wxData.hourly?.apparent_temperature ?? [];
    const allWetBulbs = wxData.hourly?.wet_bulb_temperature_2m ?? [];
    const allUVIndices = wxData.hourly?.uv_index ?? [];
    const allWindSpeeds = wxData.hourly?.wind_speed_10m ?? [];
    const allRainProbs = wxData.hourly?.precipitation_probability ?? [];
    const allAQIValues = aqData?.hourly?.us_aqi ?? [];

    // Optional Microsoft Aurora bias-correction for Hyderabad coordinates
    let auroraApplied = false;
    if (isHyd && aurora && allHours.length > 0) {
      try {
        const series = sampleAuroraPoint(aurora, lat, lon);
        if (series && series.length > 0) {
          // Compare Aurora at available snapshots against Open-Meteo to calculate thermal delta Δ
          const deltas = [];
          for (const s of series) {
            const sIst = new Date(Date.parse(s.validTime) + IST_OFFSET_MS).toISOString().slice(0, 13);
            const idx = allHours.findIndex((h) => h.startsWith(sIst));
            if (idx >= 0 && Number.isFinite(allTemps[idx])) {
              deltas.push(s.tempC - allTemps[idx]);
            }
          }
          if (deltas.length > 0) {
            const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
            if (Math.abs(avgDelta) <= 4.0) {
              allTemps = allTemps.map((t) => (Number.isFinite(t) ? Math.round((t + avgDelta) * 10) / 10 : t));
              auroraApplied = true;
            }
          }
        }
      } catch (err) {
        console.warn('[forecast] Aurora blending skipped:', err.message);
      }
    }

    // Determine current hour index in IST
    const nowIstHour = new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 13);
    let startIdx = allHours.findIndex((h) => h.startsWith(nowIstHour));
    if (startIdx < 0) startIdx = 0; // Default to first available hour if in tests or future

    // Slice rolling 24-hour window
    const windowHours = allHours.slice(startIdx, startIdx + 24);
    const windowTemps = allTemps.slice(startIdx, startIdx + 24);
    const windowFeels = allFeelsLike.slice(startIdx, startIdx + 24);
    const windowWetBulbs = allWetBulbs.slice(startIdx, startIdx + 24);
    const windowUVs = allUVIndices.slice(startIdx, startIdx + 24);
    const windowWinds = allWindSpeeds.slice(startIdx, startIdx + 24);
    const windowRainProbs = allRainProbs.slice(startIdx, startIdx + 24);
    const windowAQI = allAQIValues.slice(startIdx, startIdx + 24);

    // Analyze 24-hour temporal shifts
    const shifts = analyzeRolling24HourChanges({
      hours: windowHours,
      temps: windowTemps,
      feelsLike: windowFeels,
      wetBulbs: windowWetBulbs,
      uvIndices: windowUVs,
      rainProbs: windowRainProbs,
      aqiValues: windowAQI,
      auroraApplied,
    });

    // Compute peaks over the rolling 24 hours (with fallback to all arrays if window is small)
    const validTemps = (windowTemps.length ? windowTemps : allTemps).filter(Number.isFinite);
    const validFeels = (windowFeels.length ? windowFeels : allFeelsLike).filter(Number.isFinite);
    const validWetBulbs = (windowWetBulbs.length ? windowWetBulbs : allWetBulbs).filter(Number.isFinite);
    const validUVs = (windowUVs.length ? windowUVs : allUVIndices).filter(Number.isFinite);
    const validAQIs = (windowAQI.length ? windowAQI : allAQIValues).filter(Number.isFinite);
    const validWinds = (windowWinds.length ? windowWinds : allWindSpeeds).filter(Number.isFinite);

    const peakTemp = validTemps.length ? Math.max(...validTemps) : null;
    const peakFeels = validFeels.length ? Math.max(...validFeels) : null;
    const peakWetBulb = validWetBulbs.length ? Math.max(...validWetBulbs) : null;
    const peakUV = validUVs.length ? Math.max(...validUVs) : null;
    const peakAQI = validAQIs.length ? Math.max(...validAQIs) : null;
    const peakWindKph = validWinds.length ? Math.max(...validWinds) : null;

    const peakTempIdx = peakTemp !== null ? allTemps.indexOf(peakTemp) : -1;
    const peakTempHour = peakTempIdx >= 0 ? allHours[peakTempIdx] : null;

    const peakAQIIdx = peakAQI !== null ? allAQIValues.indexOf(peakAQI) : -1;
    const peakAQIHour = peakAQIIdx >= 0 ? (aqData?.hourly?.time ?? [])[peakAQIIdx] : null;

    const dailyMaxTemp = wxData.daily?.temperature_2m_max?.[0] ?? peakTemp;
    const dailyMinTemp = wxData.daily?.temperature_2m_min?.[0] ?? null;
    const dailyMaxUV = wxData.daily?.uv_index_max?.[0] ?? peakUV;
    const dailyRain = wxData.daily?.precipitation_sum?.[0] ?? 0;

    const heatRisk = classifyHeatRisk(peakFeels ?? peakTemp, peakWetBulb);
    const aqiRisk = classifyAQIRisk(peakAQI);

    const result = {
      cityName: opts.cityName || null,
      lat,
      lon,
      fetchedAt: Date.now(),
      auroraApplied,
      peaks: {
        temperature: peakTemp,
        feelsLike: peakFeels,
        wetBulb: peakWetBulb,
        uvIndex: peakUV,
        aqi: peakAQI,
        windKph: peakWindKph,
        tempAt: peakTempHour,
        aqiAt: peakAQIHour,
      },
      daily: {
        maxTemp: dailyMaxTemp,
        minTemp: dailyMinTemp,
        maxUV: dailyMaxUV,
        rainMm: dailyRain,
      },
      risk: {
        heatLevel: heatRisk.level,
        heatLabel: heatRisk.label,
        aqiLevel: aqiRisk.level,
        aqiLabel: aqiRisk.label,
        shouldAlert:
          heatRisk.level === 'extreme' ||
          heatRisk.level === 'high' ||
          aqiRisk.level === 'hazardous' ||
          aqiRisk.level === 'unhealthy',
      },
      summary: buildForecastSummary({
        peakTemp,
        peakFeels,
        peakWetBulb,
        peakUV,
        peakAQI,
        peakTempHour,
        peakAQIHour,
        heatRisk,
        aqiRisk,
      }),
      shifts,
      summary24h: shifts.summaryText,
    };

    FORECAST_CACHE.set(key, { data: result, ts: Date.now() });
    return result;
  } catch (err) {
    console.error('[forecast] error:', err.message);
    return null;
  }
}
