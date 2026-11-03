import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isNearHyderabad, fetch5DayForecast } from '../lib/forecast5d.js';
import { ingestAuroraForecast, _resetAuroraFeed } from '../lib/auroraFeed.js';

describe('5-Day Regional Forecast Engine (lib/forecast5d.js)', () => {
  const originalFetch = global.fetch;

  const sampleAuroraPayload = {
    schema_version: 1,
    provenance: 'aurora-inference',
    model: 'Microsoft Aurora 0.25° Fine-Tuned',
    initial_conditions: 'ECMWF IFS HRES open data',
    init_time: '2026-05-15T00:00:00Z',
    generated_at: '2026-05-15T03:30:00Z',
    grid: {
      lats: [18.25, 17.5, 16.75],
      lons: [77.5, 78.5, 79.5],
    },
    steps: [
      {
        valid_time: '2026-05-15T06:00:00Z', // 11:30 IST
        t2m_c: [
          [35.0, 36.0, 35.5],
          [36.0, 37.5, 36.8],
          [35.5, 36.8, 36.2],
        ],
        wind10m_kph: [
          [15.0, 18.0, 16.0],
          [16.0, 20.0, 18.0],
          [15.0, 19.0, 17.0],
        ],
      },
      {
        valid_time: '2026-05-15T12:00:00Z', // 17:30 IST
        t2m_c: [
          [38.0, 39.5, 39.0],
          [39.0, 41.0, 40.2],
          [38.5, 40.2, 39.5],
        ],
        wind10m_kph: [
          [18.0, 22.0, 20.0],
          [20.0, 24.0, 22.0],
          [19.0, 23.0, 21.0],
        ],
      },
      {
        valid_time: '2026-05-16T06:00:00Z',
        t2m_c: [
          [36.0, 37.0, 36.5],
          [37.0, 38.5, 37.8],
          [36.5, 37.8, 37.2],
        ],
        wind10m_kph: [
          [16.0, 19.0, 17.0],
          [17.0, 21.0, 19.0],
          [16.0, 20.0, 18.0],
        ],
      },
      {
        valid_time: '2026-05-16T12:00:00Z',
        t2m_c: [
          [39.0, 40.5, 40.0],
          [40.0, 42.0, 41.2],
          [39.5, 41.2, 40.5],
        ],
        wind10m_kph: [
          [19.0, 23.0, 21.0],
          [21.0, 25.0, 23.0],
          [20.0, 24.0, 22.0],
        ],
      },
    ],
  };

  const mockOpenMeteoResponse = {
    daily: {
      time: ['2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18', '2026-05-19'],
      temperature_2m_max: [39.5, 41.0, 42.5, 43.0, 38.0],
      temperature_2m_min: [28.0, 29.0, 30.0, 29.5, 27.0],
      apparent_temperature_max: [43.0, 45.0, 46.5, 47.0, 41.0],
      uv_index_max: [9.5, 10.0, 10.5, 10.0, 8.5],
      precipitation_probability_max: [10, 5, 0, 15, 60],
      precipitation_sum: [0.0, 0.0, 0.0, 0.2, 12.5],
      wind_speed_10m_max: [18.2, 19.5, 22.0, 24.1, 20.0],
    },
    hourly: {
      time: [
        '2026-05-15T11:00',
        '2026-05-15T12:00',
        '2026-05-15T17:00',
        '2026-05-15T18:00',
        '2026-05-16T11:00',
        '2026-05-16T12:00',
        '2026-05-16T17:00',
        '2026-05-16T18:00',
      ],
      temperature_2m: [36.0, 37.0, 40.0, 39.0, 37.0, 38.0, 41.0, 40.0],
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    _resetAuroraFeed();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    _resetAuroraFeed();
  });

  describe('isNearHyderabad', () => {
    it('returns true for coordinates within the Hyderabad metropolitan bounding box', () => {
      expect(isNearHyderabad(17.385, 78.486)).toBe(true);
      expect(isNearHyderabad(17.15, 78.25)).toBe(true);
      expect(isNearHyderabad(17.65, 78.65)).toBe(true);
    });

    it('returns false for distant coordinates outside Hyderabad', () => {
      expect(isNearHyderabad(28.61, 77.20)).toBe(false); // Delhi
      expect(isNearHyderabad(12.97, 77.59)).toBe(false); // Bengaluru
      expect(isNearHyderabad(19.07, 72.87)).toBe(false); // Mumbai
    });

    it('returns false for invalid or missing coordinate inputs', () => {
      expect(isNearHyderabad(null, 78.486)).toBe(false);
      expect(isNearHyderabad(17.385, undefined)).toBe(false);
      expect(isNearHyderabad('17.385', '78.486')).toBe(false);
      expect(isNearHyderabad(NaN, 78.486)).toBe(false);
    });
  });

  describe('fetch5DayForecast', () => {
    it('returns null if coordinates are invalid', async () => {
      const result = await fetch5DayForecast(null, null);
      expect(result).toBeNull();
    });

    it('merges live Aurora feed with Open-Meteo for Hyderabad area', async () => {
      await ingestAuroraForecast(sampleAuroraPayload);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockOpenMeteoResponse,
      });

      const forecast = await fetch5DayForecast(17.385, 78.486, 'Hyderabad', {
        now: Date.parse('2026-05-15T04:00:00Z'),
      });

      expect(forecast).not.toBeNull();
      expect(forecast.isAuroraCovered).toBe(true);
      expect(forecast.cityName).toBe('Hyderabad');
      expect(forecast.days).toHaveLength(5);

      const day1 = forecast.days[0];
      expect(day1.source).toContain('Microsoft Aurora');
      expect(day1).toHaveProperty('maxTemp');
      expect(day1).toHaveProperty('minTemp');
      expect(day1).toHaveProperty('uvMax');
      expect(day1).toHaveProperty('rainProb');
      expect(day1).toHaveProperty('riskLevel');
    });

    it('identifies heatwave streak correctly', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockOpenMeteoResponse,
      });

      const forecast = await fetch5DayForecast(17.385, 78.486, 'Hyderabad');
      expect(forecast.hasHeatwaveStreak).toBe(true);
    });

    it('uses pure Open-Meteo for locations outside Hyderabad', async () => {
      await ingestAuroraForecast(sampleAuroraPayload);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockOpenMeteoResponse,
      });

      // Delhi coordinates
      const forecast = await fetch5DayForecast(28.6139, 77.209, 'Delhi');

      expect(forecast).not.toBeNull();
      expect(forecast.isAuroraCovered).toBe(false);
      expect(forecast.cityName).toBe('Delhi');
      expect(forecast.days[0].source).toBe('Open-Meteo');
      expect(forecast.days[0].maxTemp).toBe(39.5);
    });

    it('falls back gracefully to pure Open-Meteo if Aurora feed is absent or expired', async () => {
      // No Aurora ingested
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockOpenMeteoResponse,
      });

      const forecast = await fetch5DayForecast(17.385, 78.486, 'Hyderabad');
      expect(forecast).not.toBeNull();
      expect(forecast.isAuroraCovered).toBe(false);
      expect(forecast.days[0].source).toBe('Open-Meteo');
    });
  });
});
