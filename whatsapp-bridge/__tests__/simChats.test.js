import { describe, it, expect } from 'vitest';
import { SIMULATED_WOMEN_SCENARIOS, getSimulatedWomenObservatory } from '../lib/simChats.js';
import { validateModelOutput } from '../../shared/safetyCore.js';

describe('Live Chat Observatory — 15 Simulated Women Scenarios', () => {
  it('contains exactly 15 simulated women scenarios with synthetic DYL-SIM IDs', () => {
    expect(SIMULATED_WOMEN_SCENARIOS).toHaveLength(15);
    const ids = new Set(SIMULATED_WOMEN_SCENARIOS.map((s) => s.id));
    expect(ids.size).toBe(15);
    for (const s of SIMULATED_WOMEN_SCENARIOS) {
      expect(s.id).toMatch(/^DYL-SIM-\d{2}$/);
      expect(s.turns.length).toBeGreaterThanOrEqual(4);
      // Ensure no real 10-digit Indian mobile numbers appear in display names
      expect(s.displayName).not.toMatch(/\b[6-9]\d{9}\b/);
    }
  });

  it('covers all 6 user cohorts (pregnant 1st/2nd/3rd, infant, child, general) in English', () => {
    const cohorts = new Set(SIMULATED_WOMEN_SCENARIOS.map((s) => s.cohort));
    expect(cohorts).toEqual(
      new Set(['pregnant_3rd', 'pregnant_2nd', 'pregnant_1st', 'infant', 'child', 'general'])
    );

    const locales = new Set(SIMULATED_WOMEN_SCENARIOS.map((s) => s.locale));
    expect(locales).toEqual(new Set(['en']));
  });

  it('covers all 5 clinical & climate service categories and enriches with nearest ready labour room', () => {
    const enriched = getSimulatedWomenObservatory();
    expect(enriched).toHaveLength(15);

    const serviceIds = new Set(enriched.map((s) => s.serviceId));
    expect(serviceIds).toEqual(
      new Set([
        'labour_room_hospital',
        'obstetric_triage',
        'infant_pediatric_care',
        'hyperlocal_weather_aqi',
        'maternal_heat_hydration',
      ])
    );

    for (const s of enriched) {
      expect(s.simulated).toBe(true);
      expect(s.nearestHospital).toBeTruthy();
      expect(s.nearestHospital.readyLabourRooms).toBeGreaterThan(0);
    }
  });

  it('passes deterministic clinical safety validation on all assistant replies (including WHO <6m infant water rule)', () => {
    for (const s of SIMULATED_WOMEN_SCENARIOS) {
      const safety = {
        subject: s.subjectType,
        riskLevel: s.riskLevel === 'high' ? 'emergency' : s.riskLevel,
      };
      for (const turn of s.turns.filter((t) => t.role === 'assistant')) {
        const check = validateModelOutput({ text: turn.text, safety });
        expect(check.violations).toEqual([]);
      }
    }
  });
});
