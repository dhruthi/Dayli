import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateAuroraPayload,
  ingestAuroraForecast,
  getAuroraForecast,
  sampleAuroraPoint,
  auroraStatus,
  _resetAuroraFeed,
} from '../lib/auroraFeed.js';

describe('Aurora Feed (lib/auroraFeed.js)', () => {
  const envBackup = { ...process.env };

  const validPayload = {
    schema_version: 1,
    provenance: 'aurora-inference',
    model: 'Microsoft Aurora 0.25° Fine-Tuned',
    initial_conditions: 'ECMWF IFS HRES open data',
    init_time: '2026-10-12T00:00:00Z',
    generated_at: '2026-10-12T03:30:00Z',
    grid: {
      lats: [18.25, 17.5, 16.75],
      lons: [77.5, 78.5, 79.5],
    },
    steps: [
      {
        valid_time: '2026-10-12T06:00:00Z',
        t2m_c: [
          [28.0, 29.5, 29.0],
          [29.0, 31.0, 30.2],
          [28.5, 30.1, 29.8],
        ],
        wind10m_kph: [
          [12.0, 15.0, 14.0],
          [14.0, 16.5, 15.0],
          [13.0, 15.2, 14.8],
        ],
      },
      {
        valid_time: '2026-10-12T12:00:00Z',
        t2m_c: [
          [36.0, 38.0, 37.5],
          [37.2, 39.5, 38.8],
          [36.8, 38.7, 38.0],
        ],
        wind10m_kph: [
          [15.0, 18.0, 16.5],
          [16.0, 20.0, 18.5],
          [15.5, 19.0, 17.8],
        ],
      },
      {
        valid_time: '2026-10-12T18:00:00Z',
        t2m_c: [
          [31.0, 32.5, 32.0],
          [32.0, 34.0, 33.2],
          [31.5, 33.1, 32.8],
        ],
        wind10m_kph: [
          [10.0, 12.0, 11.0],
          [11.0, 14.0, 12.5],
          [10.5, 13.0, 12.0],
        ],
      },
      {
        valid_time: '2026-10-13T00:00:00Z',
        t2m_c: [
          [25.0, 26.5, 26.0],
          [26.0, 27.5, 27.0],
          [25.5, 26.8, 26.4],
        ],
        wind10m_kph: [
          [8.0, 10.0, 9.0],
          [9.0, 11.5, 10.0],
          [8.5, 10.8, 9.5],
        ],
      },
    ],
  };

  beforeEach(() => {
    _resetAuroraFeed();
    process.env = { ...envBackup };
  });

  afterEach(() => {
    _resetAuroraFeed();
    process.env = { ...envBackup };
    vi.restoreAllMocks();
  });

  describe('validateAuroraPayload', () => {
    it('approves a well-formed Aurora inference payload covering Hyderabad', () => {
      const res = validateAuroraPayload(validPayload);
      expect(res.ok).toBe(true);
      expect(res.value).toBe(validPayload);
    });

    it('rejects synthetic / demo provenance to protect clinical advice', () => {
      const bad = { ...validPayload, provenance: 'synthetic-generator' };
      const res = validateAuroraPayload(bad);
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/provenance/);
    });

    it('accepts ECMWF AIFS provenance', () => {
      const payload = { ...validPayload, provenance: 'aifs-inference', model: 'ECMWF AIFS 0.25° (via Open-Meteo)' };
      const res = validateAuroraPayload(payload);
      expect(res.ok).toBe(true);
    });

    it('accepts WeatherNext provenance', () => {
      const payload = { ...validPayload, provenance: 'weathernext-inference', model: 'Google WeatherNext 2-mini' };
      const res = validateAuroraPayload(payload);
      expect(res.ok).toBe(true);
    });

    it('rejects a grid that does not cover the Hyderabad metropolitan area', () => {
      const bad = {
        ...validPayload,
        grid: {
          lats: [28.0, 29.0], // Delhi area
          lons: [77.0, 78.0],
        },
      };
      const res = validateAuroraPayload(bad);
      expect(res.ok).toBe(false);
      expect(res.error).toContain('does not cover the Hyderabad area');
    });

    it('rejects implausible meteorological values', () => {
      const bad = {
        ...validPayload,
        steps: [
          {
            ...validPayload.steps[0],
            t2m_c: [
              [99.0, 29.5, 29.0], // 99°C is physically impossible
              [29.0, 31.0, 30.2],
              [28.5, 30.1, 29.8],
            ],
          },
          ...validPayload.steps.slice(1),
        ],
      };
      const res = validateAuroraPayload(bad);
      expect(res.ok).toBe(false);
      expect(res.error).toContain('implausible');
    });
  });

  describe('ingestAuroraForecast & getAuroraForecast', () => {
    it('accepts and retrieves fresh model forecasts', async () => {
      const ingest = await ingestAuroraForecast(validPayload);
      expect(ingest.ok).toBe(true);

      const f = await getAuroraForecast({ now: Date.parse('2026-10-12T04:00:00Z') });
      expect(f).not.toBeNull();
      expect(f.model).toContain('Microsoft Aurora');
    });

    it('treats stale forecasts (>30h old) as expired', async () => {
      await ingestAuroraForecast(validPayload);

      // 35 hours after init_time (init: 2026-10-12T00:00:00Z)
      const f = await getAuroraForecast({ now: Date.parse('2026-10-13T11:00:00Z') });
      expect(f).toBeNull();
    });

    it('interpolates temperature accurately for Hyderabad central coordinates', () => {
      // Hyderabad center: 17.385° N, 78.486° E
      const sampled = sampleAuroraPoint(validPayload, 17.385, 78.486);
      expect(sampled).not.toBeNull();
      expect(sampled).toHaveLength(4);
      // Row 1 lat ~17.5, Col 1 lon ~78.5 has t2m ~31.0°C at step 0
      expect(sampled[0].tempC).toBeGreaterThan(29.0);
      expect(sampled[0].tempC).toBeLessThan(32.0);
      expect(sampled[0].windKph).toBeGreaterThan(10);
    });

    it('reports clean status metadata', async () => {
      await ingestAuroraForecast(validPayload);
      const s = await auroraStatus({ now: Date.parse('2026-10-12T05:00:00Z') });
      expect(s.loaded).toBe(true);
      expect(s.fresh).toBe(true);
      expect(s.steps).toBe(4);
      expect(s.ageHours).toBe(5);
    });

  });

  // Regression guard. This module once shipped `generateHyderabadAuroraPayload`,
  // a sine-wave generator that stamped itself `provenance: 'aurora-inference'` —
  // the exact string validateAuroraPayload demands — and fed synthetic
  // temperatures into maternal-health heat advice via forecast.js/forecast5d.js.
  // The feed is push-only now. Data may only enter from a real model run.
  describe('no synthetic data generation', () => {
    it('exports no forecast-generating function', async () => {
      const mod = await import('../lib/auroraFeed.js');
      const generators = Object.keys(mod).filter((k) => /^(generate|ensureFresh|synth|fake|mock)/i.test(k));
      expect(generators).toEqual([]);
    });

    it('returns null rather than inventing a forecast when nothing is loaded', async () => {
      _resetAuroraFeed();
      process.env.AURORA_FORECAST_PATH = '/nonexistent/aurora-feed.json';
      delete process.env.AURORA_FORECAST_URL;

      await expect(getAuroraForecast()).resolves.toBeNull();
      await expect(auroraStatus()).resolves.toMatchObject({ loaded: false, fresh: false });
    });

    it('still refuses a payload that is not labelled as real inference', () => {
      const synthetic = { ...validPayload, provenance: 'synthetic' };
      const res = validateAuroraPayload(synthetic);
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/provenance/);
    });
  });
});

