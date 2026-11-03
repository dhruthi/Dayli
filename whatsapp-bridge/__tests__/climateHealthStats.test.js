import { describe, it, expect, beforeEach } from 'vitest';
import { Store } from '../lib/store.js';
import {
  getClimateHealthSnapshot,
  assignUniqueDayliId,
  redactPhi,
  _clearClimateHealthCache,
} from '../lib/climateHealthStats.js';

describe('Dayli AI Climate-Health Surveillance Stats (lib/climateHealthStats.js)', () => {
  beforeEach(() => {
    _clearClimateHealthCache();
  });

  it('aggregates maternal, pediatric, and general metrics with strict Zero-PHI Unique IDs and Ready Labour Room routing', async () => {
    const store = await Store.create();

    // Setup 1 pregnant user (3rd trimester) with a real name and phone number
    const s1 = await store.getSession('919000000001');
    s1.consent.granted = true;
    s1.profile = {
      name: 'Pooja Sharma',
      locale: 'te',
      subjectType: 'pregnant_person',
      pregnancyTrimester: '3rd Trimester',
      location: { name: 'Hyderabad', latitude: 17.385, longitude: 78.4867 },
    };
    Store.appendHistory(s1, 'user', 'My name is Pooja Sharma and my phone is +91 9000000001');
    Store.appendHistory(s1, 'assistant', 'Hi Pooja Sharma, call +91 9000000001 or drink coconut water.');
    await store.saveSession('919000000001', s1);

    // Setup 1 infant user
    const s2 = await store.getSession('919000000002');
    s2.consent.granted = true;
    s2.profile = {
      name: 'Baby Yash',
      locale: 'en',
      subjectType: 'infant',
      childAgeMonths: 4,
      location: { name: 'Secunderabad', latitude: 17.4399, longitude: 78.4983 },
    };
    await store.saveSession('919000000002', s2);

    const mockClimateFetcher = async () => ({
      cityName: 'Hyderabad',
      temperature: 36,
      feelsLike: 39,
      humidity: 60,
      aqi: 95,
      uvIndex: 8,
      heatRisk: 'High Heat Caution',
    });

    const snapshot = await getClimateHealthSnapshot({
      store,
      fetchClimateIntelligence: mockClimateFetcher,
    });

    // Validate structure
    expect(snapshot).toHaveProperty('climate');
    expect(snapshot).toHaveProperty('aurora');
    expect(snapshot).toHaveProperty('maternal');
    expect(snapshot).toHaveProperty('pediatric');
    expect(snapshot).toHaveProperty('general');
    expect(snapshot).toHaveProperty('hospitals');
    expect(snapshot).toHaveProperty('heatGrid');
    expect(snapshot).toHaveProperty('mapUsers');
    expect(snapshot).toHaveProperty('liveWhatsappChats');
    expect(snapshot).toHaveProperty('recentInterventions');
    expect(snapshot).toHaveProperty('funnel');
    expect(snapshot.funnel).toHaveProperty('optedOut');
    expect(snapshot).toHaveProperty('feedback');
    expect(snapshot.feedback).toHaveProperty('csatPct');
    expect(snapshot.feedback).toHaveProperty('totalResponses');
    expect(snapshot.feedback).toHaveProperty('ratings');

    // STRICT ZERO-PHI VERIFICATION: No raw names or phone numbers anywhere in the payload
    const rawJson = JSON.stringify(snapshot);
    expect(rawJson).not.toContain('Pooja Sharma');
    expect(rawJson).not.toContain('Baby Yash');
    expect(rawJson).not.toContain('919000000001');
    expect(rawJson).not.toContain('919000000002');

    // Maternal validations
    expect(snapshot.maternal.totalMonitored).toBeGreaterThanOrEqual(1);
    expect(snapshot.maternal.byTrimester['3rd Trimester']).toBeGreaterThanOrEqual(1);
    expect(snapshot.climate.maternalRisk).toContain('HEAT');

    // Pediatric WHO guardrail validation
    expect(snapshot.pediatric.totalInfants).toBeGreaterThanOrEqual(1);
    expect(snapshot.pediatric.waterViolationCount).toBe(0);

    // Geographic Heatmap, Unique IDs & Nearest Ready Labour Room Routing validations
    expect(Array.isArray(snapshot.hospitals)).toBe(true);
    expect(snapshot.hospitals.length).toBeGreaterThanOrEqual(6);

    expect(Array.isArray(snapshot.mapUsers)).toBe(true);
    expect(snapshot.mapUsers.length).toBeGreaterThanOrEqual(2);
    for (const u of snapshot.mapUsers) {
      expect(u.id).toMatch(/^DYL-(MAT|INF|PED|COM)-[0-9A-F]{4}$/);
      expect(u.uniqueId).toBe(u.id);
      expect(u.displayName).toBe(u.id);
      expect(typeof u.lat).toBe('number');
      expect(typeof u.lon).toBe('number');
      expect(typeof u.zone).toBe('string');
      expect(u.nearestLabourRoom).toBeDefined();
      expect(typeof u.nearestLabourRoom.distanceKm).toBe('number');
      expect(u.nearestLabourRoom.readyLabourRooms).toBeGreaterThan(0);
    }
  });

  it('redacts phone numbers, emails, and names deterministically', () => {
    const id1 = assignUniqueDayliId('919876543210', 'pregnant_person');
    const id2 = assignUniqueDayliId('919876543210', 'pregnant_person');
    expect(id1).toBe(id2);
    expect(id1).toMatch(/^DYL-MAT-[0-9A-F]{4}$/);

    const scrubbed = redactPhi(
      'Patient Lakshmi called from +91 98765 43210 and email lakshmi@example.com',
      'Lakshmi'
    );
    expect(scrubbed).not.toContain('98765');
    expect(scrubbed).not.toContain('lakshmi@example.com');
    expect(scrubbed).not.toContain('Lakshmi');
  });

  it('computes wet-bulb temperature and maternal risk categories', async () => {
    const store = await Store.create();
    const extremeClimateFetcher = async () => ({
      cityName: 'Hyderabad',
      temperature: 43,
      feelsLike: 47,
      humidity: 50,
      aqi: 160,
      uvIndex: 11,
    });

    const snapshot = await getClimateHealthSnapshot({
      store,
      fetchClimateIntelligence: extremeClimateFetcher,
    });
    expect(snapshot.climate.temperature).toBe(43);
    expect(snapshot.climate.wetBulb).toBeGreaterThan(25);
    expect(snapshot.climate.maternalRiskLevel).toBe('bad');
    expect(snapshot.climate.maternalRisk).toContain('EXTREME HEAT STRESS');
    expect(snapshot.climate.aqiRiskLevel).toBe('bad');
  });

  it('handles empty or erroring climate fetches gracefully without throwing', async () => {
    const store = await Store.create();
    const failingFetcher = async () => {
      throw new Error('Climate API network error');
    };

    const snapshot = await getClimateHealthSnapshot({
      store,
      fetchClimateIntelligence: failingFetcher,
    });
    expect(snapshot).toBeDefined();
    expect(snapshot.climate.location).toContain('Hyderabad');
    expect(typeof snapshot.climate.temperature).toBe('number');
  });
});
