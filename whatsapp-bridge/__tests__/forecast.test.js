import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchAuroraForecast,
  classifyHeatRisk,
  classifyAQIRisk,
  buildForecastSummary,
  analyzeRolling24HourChanges,
  clearForecastCache,
} from '../lib/forecast.js';

describe('Aurora Climate Forecasting Intelligence (lib/forecast.js)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    clearForecastCache();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('Risk Classifications', () => {
    it('classifies extreme heat from wet-bulb >= 33°C or apparent temp >= 45°C', () => {
      expect(classifyHeatRisk(36, 33.5).level).toBe('extreme');
      expect(classifyHeatRisk(46, 25).level).toBe('extreme');
    });

    it('classifies high heat stress from wet-bulb >= 28°C or apparent temp >= 38°C', () => {
      expect(classifyHeatRisk(35, 29).level).toBe('high');
      expect(classifyHeatRisk(39, 24).level).toBe('high');
    });

    it('classifies moderate heat from apparent temp >= 33°C', () => {
      expect(classifyHeatRisk(34, 23).level).toBe('moderate');
    });

    it('classifies normal heat when conditions are mild', () => {
      expect(classifyHeatRisk(28, 20).level).toBe('normal');
    });

    it('classifies AQI correctly across standard categories', () => {
      expect(classifyAQIRisk(250).level).toBe('hazardous');
      expect(classifyAQIRisk(175).level).toBe('unhealthy');
      expect(classifyAQIRisk(120).level).toBe('moderate');
      expect(classifyAQIRisk(45).level).toBe('good');
      expect(classifyAQIRisk(null).level).toBe('unknown');
    });
  });

  describe('buildForecastSummary', () => {
    it('generates a clean plain text summary with peak values', () => {
      const summary = buildForecastSummary({
        peakTemp: 39,
        peakFeels: 42,
        peakWetBulb: 29.5,
        peakUV: 9,
        peakAQI: 165,
        peakTempHour: '2026-05-15T14:00',
        peakAQIHour: '2026-05-15T09:00',
        heatRisk: { label: 'High Heat Warning' },
        aqiRisk: { label: 'Unhealthy AQI' },
      });

      expect(summary).toContain('Peak temperature today: 39°C (feels like 42°C)');
      expect(summary).toContain('Wet-bulb temperature: 29.5°C');
      expect(summary).toContain('Peak UV index: 9/11');
      expect(summary).toContain('Peak AQI (US): 165');
      expect(summary).toContain('High Heat Warning');
      expect(summary).toContain('Unhealthy AQI');
    });
  });

  describe('fetchAuroraForecast API Client', () => {
    it('returns null for invalid coordinates', async () => {
      expect(await fetchAuroraForecast(null, 78.5)).toBeNull();
      expect(await fetchAuroraForecast(NaN, 78.5)).toBeNull();
    });

    it('fetches and derives peaks from Open-Meteo hourly response', async () => {
      global.fetch = vi.fn(async (url) => {
        if (url.includes('air-quality-api')) {
          return {
            ok: true,
            json: async () => ({
              hourly: {
                time: ['2026-05-15T00:00', '2026-05-15T12:00'],
                us_aqi: [60, 180],
                pm2_5: [15, 65],
                pm10: [30, 110],
              },
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({
            hourly: {
              time: ['2026-05-15T00:00', '2026-05-15T14:00'],
              temperature_2m: [26, 41],
              apparent_temperature: [28, 44],
              wet_bulb_temperature_2m: [22, 30.5],
              uv_index: [0, 10],
              wind_speed_10m: [5, 18],
            },
            daily: {
              temperature_2m_max: [41],
              temperature_2m_min: [25],
              uv_index_max: [10],
              precipitation_sum: [0],
            },
          }),
        };
      });

      const forecast = await fetchAuroraForecast(17.385, 78.486);
      expect(forecast).not.toBeNull();
      expect(forecast.peaks.temperature).toBe(41);
      expect(forecast.peaks.feelsLike).toBe(44);
      expect(forecast.peaks.wetBulb).toBe(30.5);
      expect(forecast.peaks.uvIndex).toBe(10);
      expect(forecast.peaks.aqi).toBe(180);
      expect(forecast.risk.heatLevel).toBe('high');
      expect(forecast.risk.aqiLevel).toBe('unhealthy');
      expect(forecast.risk.shouldAlert).toBe(true);

      // Verify second call is served from cache
      const cached = await fetchAuroraForecast(17.385, 78.486);
      expect(cached).toBe(forecast);
      expect(global.fetch).toHaveBeenCalledTimes(2); // exactly 1 pair of calls
    });

    it('returns null gracefully on Open-Meteo network failure', async () => {
      global.fetch = vi.fn(async () => ({
        ok: false,
        status: 503,
      }));

      const result = await fetchAuroraForecast(17.385, 78.486);
      expect(result).toBeNull();
    });

    it('populates rolling 24-hour shifts and narrative summary in forecast result', async () => {
      global.fetch = vi.fn(async (url) => {
        if (url.includes('air-quality-api')) {
          return {
            ok: true,
            json: async () => ({
              hourly: {
                time: Array.from({ length: 48 }, (_, i) => `2026-05-15T${String(i % 24).padStart(2, '0')}:00`),
                us_aqi: Array.from({ length: 48 }, (_, i) => (i === 18 ? 145 : 55)),
              },
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({
            hourly: {
              time: Array.from({ length: 48 }, (_, i) => `2026-05-15T${String(i % 24).padStart(2, '0')}:00`),
              temperature_2m: Array.from({ length: 48 }, (_, i) => (i % 24 === 14 ? 35 : i % 24 === 5 ? 22 : 27)),
              apparent_temperature: Array.from({ length: 48 }, (_, i) => (i % 24 === 14 ? 38 : 28)),
              wet_bulb_temperature_2m: Array.from({ length: 48 }, () => 24),
              uv_index: Array.from({ length: 48 }, () => 7),
              wind_speed_10m: Array.from({ length: 48 }, () => 12),
              precipitation_probability: Array.from({ length: 48 }, (_, i) => (i % 24 === 17 ? 65 : 10)),
            },
            daily: {
              temperature_2m_max: [35],
              temperature_2m_min: [22],
              uv_index_max: [7],
              precipitation_sum: [2.5],
            },
          }),
        };
      });

      const forecast = await fetchAuroraForecast(17.385, 78.486);
      expect(forecast).not.toBeNull();
      expect(forecast.shifts).toBeDefined();
      expect(forecast.shifts.hasData).toBe(true);
      expect(forecast.shifts.temperature.max).toBe(35);
      expect(forecast.shifts.temperature.min).toBe(22);
      expect(forecast.shifts.temperature.swing).toBe(13);
      expect(forecast.shifts.rain.expected).toBe(true);
      expect(forecast.shifts.rain.maxProb).toBe(65);
      expect(forecast.summary24h).toContain('Temperature trajectory');
    });
  });

  describe('analyzeRolling24HourChanges analyzer', () => {
    it('accurately derives temperature swing, heat stress window, rain onset, and AQI shifts', () => {
      const hours = [
        '2026-05-15T08:00',
        '2026-05-15T12:00',
        '2026-05-15T14:00',
        '2026-05-15T16:00',
        '2026-05-15T18:00',
        '2026-05-15T22:00',
        '2026-05-16T04:00',
      ];
      const temps = [26, 33, 36, 34, 29, 25, 21];
      const feelsLike = [28, 36, 40, 37, 31, 26, 22];
      const wetBulbs = [22, 27, 29, 28, 24, 22, 20];
      const uvIndices = [4, 9, 10, 6, 2, 0, 0];
      const rainProbs = [5, 10, 15, 20, 60, 45, 10];
      const aqiValues = [50, 65, 70, 85, 130, 90, 55];

      const analysis = analyzeRolling24HourChanges({
        hours,
        temps,
        feelsLike,
        wetBulbs,
        uvIndices,
        rainProbs,
        aqiValues,
        auroraApplied: true,
      });

      expect(analysis.hasData).toBe(true);
      expect(analysis.current.temperature).toBe(26);
      expect(analysis.temperature.max).toBe(36);
      expect(analysis.temperature.min).toBe(21);
      expect(analysis.temperature.swing).toBe(15);
      expect(analysis.temperature.riseFromCurrent).toBe(10);
      expect(analysis.heatWindow.hasPeakHeat).toBe(true);
      expect(analysis.rain.expected).toBe(true);
      expect(analysis.rain.maxProb).toBe(60);
      expect(analysis.aqi.worsens).toBe(true);
      expect(analysis.auroraApplied).toBe(true);

      expect(analysis.summaryText).toContain('climbing to a peak of 36°C');
      expect(analysis.summaryText).toContain('net 24h swing: 15°C');
      expect(analysis.summaryText).toContain('High heat window');
      expect(analysis.summaryText).toContain('Rain / Storm shift');
      expect(analysis.summaryText).toContain('Microsoft Aurora ECMWF bias-corrected');
    });

    it('handles empty data gracefully', () => {
      const analysis = analyzeRolling24HourChanges({});
      expect(analysis.hasData).toBe(false);
    });
  });
});

