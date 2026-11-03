import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkLocalLlmAvailable,
  detectInfantWaterViolation,
  queryLocalLlmRaw,
  rewriteWithLocalLlm,
  generateWithLocalLlm,
  DEFAULT_MODEL,
} from '../lib/localLlm.js';
import { allowLocalLlm } from '../lib/coreMode.js';
import { buildMedGemmaSystemPrompt, buildMedGemmaUserPrompt } from '../lib/medgemmaPrompt.js';
import { composeSafeResponse } from '../../shared/safetyCore.js';

describe('Local Open-Weight LLM Bridge (Ollama / On-Device)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.DAYLI_LOCAL_LLM;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('Feature Flag allowLocalLlm()', () => {
    it('is disabled by default', () => {
      delete process.env.DAYLI_LOCAL_LLM;
      expect(allowLocalLlm()).toBe(false);
    });

    it('enables when DAYLI_LOCAL_LLM is "on" or "true"', () => {
      process.env.DAYLI_LOCAL_LLM = 'on';
      expect(allowLocalLlm()).toBe(true);

      process.env.DAYLI_LOCAL_LLM = 'true';
      expect(allowLocalLlm()).toBe(true);

      process.env.DAYLI_LOCAL_LLM = 'off';
      expect(allowLocalLlm()).toBe(false);
    });
  });

  describe('checkLocalLlmAvailable()', () => {
    it('returns available true and model tags on 200 response', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [{ name: 'dayli-health-3b:latest' }, { name: 'llama3.2:3b' }],
        }),
      });

      const res = await checkLocalLlmAvailable();
      expect(res.available).toBe(true);
      expect(res.models).toContain('dayli-health-3b:latest');
    });

    it('handles offline / connection refused gracefully without throwing', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('ECONNREFUSED 127.0.0.1:11434'));

      const res = await checkLocalLlmAvailable();
      expect(res.available).toBe(false);
      expect(res.error).toMatch(/ECONNREFUSED/);
    });
  });

  describe('detectInfantWaterViolation()', () => {
    it('flags affirmative advice to give water to an infant under 6 months', () => {
      const safety = { subject: 'infant', statedAgeMonths: 4 };

      const check1 = detectInfantWaterViolation('You can give water to your baby in hot weather.', safety);
      expect(check1.safe).toBe(false);
      expect(check1.reason).toContain('INFANT_WATER_VIOLATION');

      const check2 = detectInfantWaterViolation('Offer small sips of boiled water between feeds.', safety);
      expect(check2.safe).toBe(false);

      const check3 = detectInfantWaterViolation('Mix with water to keep baby hydrated.', safety);
      expect(check3.safe).toBe(false);

      const checkHindi = detectInfantWaterViolation('बच्चे को थोड़ा ठंडा पानी पिलाएं।', safety);
      expect(checkHindi.safe).toBe(false);

      const checkTelugu = detectInfantWaterViolation('పాపకు కొద్దిగా నీరు ఇవ్వండి.', safety);
      expect(checkTelugu.safe).toBe(false);
    });

    it('allows safe negations upholding the WHO infant hydration rule', () => {
      const safety = { subject: 'infant', statedAgeMonths: 3 };

      const check1 = detectInfantWaterViolation(
        'Do not give plain water to infants under 6 months. Breast milk or formula is sufficient.',
        safety
      );
      expect(check1.safe).toBe(true);

      const check2 = detectInfantWaterViolation('Avoid water for babies under 6 months.', safety);
      expect(check2.safe).toBe(true);

      const checkHindi = detectInfantWaterViolation('6 महीने से कम उम्र के बच्चों को पानी नहीं देना चाहिए।', safety);
      expect(checkHindi.safe).toBe(true);
    });

    it('does not flag hydration advice for adults or older children', () => {
      const adultSafety = { subject: 'adult' };
      const childSafety = { subject: 'child', statedAgeMonths: 24 };

      expect(detectInfantWaterViolation('Drink plenty of water in this heatwave.', adultSafety).safe).toBe(true);
      expect(detectInfantWaterViolation('Offer water frequently to the toddler.', childSafety).safe).toBe(true);
    });
  });

  describe('rewriteWithLocalLlm() Safety Guardrails', () => {
    it('bypasses local LLM completely during critical medical emergency', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      const deterministic = 'EMERGENCY: Call 108 or 112 immediately. Keep airways clear.';

      const result = await rewriteWithLocalLlm({
        deterministicReply: deterministic,
        userMessage: 'Baby turning blue and not breathing',
        safety: { riskLevel: 'emergency', subject: 'infant' },
        force: true,
      });

      expect(result.source).toBe('deterministic');
      expect(result.text).toBe(deterministic);
      expect(result.latencyMs).toBe(0);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('bypasses local LLM for high clinical risk', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      const deterministic = 'HIGH RISK: Visit primary health center today for clinical review.';

      const result = await rewriteWithLocalLlm({
        deterministicReply: deterministic,
        userMessage: 'Severe persistent diarrhea for 3 days',
        safety: { riskLevel: 'high', subject: 'child' },
        force: true,
      });

      expect(result.source).toBe('deterministic');
      expect(result.text).toBe(deterministic);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns deterministic reply when feature flag is off and force is false', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      process.env.DAYLI_LOCAL_LLM = 'off';

      const result = await rewriteWithLocalLlm({
        deterministicReply: 'Normal hydration advice',
        userMessage: 'How to stay cool today?',
        safety: { riskLevel: 'low', subject: 'adult' },
      });

      expect(result.source).toBe('deterministic');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('falls back to deterministic reply if Ollama times out or errors', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Connection aborted'));

      const deterministic = 'Stay in the shade and drink ORS or water.';
      const result = await rewriteWithLocalLlm({
        deterministicReply: deterministic,
        userMessage: 'Feeling dizzy in heat',
        safety: { riskLevel: 'moderate', subject: 'adult' },
        force: true,
        timeoutMs: 100,
      });

      expect(result.source).toBe('deterministic');
      expect(result.text).toBe(deterministic);
      expect(result.violations).toContain('Connection aborted');
    });

    it('rejects LLM rewrite if it hallucinates infant water recommendation', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            content: 'In 40C heat, give water to your 3-month-old infant to avoid dehydration.',
          },
        }),
      });

      const deterministic = 'Under 6 months, breast milk only. Do not give plain water.';
      const result = await rewriteWithLocalLlm({
        deterministicReply: deterministic,
        userMessage: 'Can I give water to 3 month baby?',
        safety: { riskLevel: 'low', subject: 'infant', statedAgeMonths: 3 },
        force: true,
      });

      expect(result.source).toBe('deterministic');
      expect(result.text).toBe(deterministic);
      expect(result.violations.some((v) => v.includes('INFANT_WATER_VIOLATION'))).toBe(true);
    });

    it('strips stated drug dosages if present and delivers cleaned output', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            content: 'For mild fever, rest in cool room. You may take 500mg paracetamol if prescribed.',
          },
        }),
      });

      const result = await rewriteWithLocalLlm({
        deterministicReply: 'Fever advice: rest and consult doctor.',
        userMessage: 'I have mild fever',
        safety: { riskLevel: 'low', subject: 'adult' },
        force: true,
      });

      expect(result.source).toBe('local_llm');
      expect(result.text).not.toContain('500mg');
      expect(result.text).toContain('[dose removed]');
      expect(result.violations).toContain('STATED_MEDICATION_DOSE');
    });

    it('delivers polished output when validation passes cleanly', async () => {
      const polished = 'Hello! In hot weather, keep your baby in a cool room with light cotton clothes and nurse frequently. Breast milk gives all the hydration they need.';
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            content: polished,
          },
        }),
      });

      const result = await rewriteWithLocalLlm({
        deterministicReply: 'Infant heat advice: breastfeed frequently.',
        userMessage: 'How to keep baby cool?',
        safety: { riskLevel: 'low', subject: 'infant', statedAgeMonths: 4 },
        force: true,
      });

      expect(result.source).toBe('local_llm');
      expect(result.text).toBe(polished);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('MedGemma OpenAI-Aligned Prompt Architecture (lib/medgemmaPrompt.js)', () => {
    it('constructs an empathetic system prompt matching OpenAI standards', () => {
      const prompt = buildMedGemmaSystemPrompt({ userName: 'Amina', locale: 'en' });
      expect(prompt).toContain('caring, warm, and knowledgeable');
      expect(prompt).toContain('Amina');
      expect(prompt).toContain('Do NOT use markdown double asterisks (**) or markdown headers (###)');
      expect(prompt).toContain('exclusive breastfeeding or formula only');
      expect(prompt).toContain('Never prescribe medication doses');
    });

    it('injects language directives when locale is Indic', () => {
      const teluguPrompt = buildMedGemmaSystemPrompt({ userName: 'Lakshmi', locale: 'te' });
      expect(teluguPrompt).toContain("Reply naturally, warmly, and strictly in te");

      const hindiPrompt = buildMedGemmaSystemPrompt({ userName: 'Pooja', locale: 'hi' });
      expect(hindiPrompt).toContain("Reply naturally, warmly, and strictly in hi");
    });

    it('constructs grounded user prompt with profile, climate, facilities, and history', () => {
      const prompt = buildMedGemmaUserPrompt({
        userMessage: 'where is the nearest hospital',
        userName: 'Priya',
        profile: {
          subjectType: 'pregnant_person',
          pregnancyWeeks: 34,
          location: { name: 'Koti, Hyderabad' },
        },
        liveContext: 'Current temp: 37C, AQI: 120 (Moderate)',
        clinicsData: [
          { name: 'Koti Maternity Hospital', distanceText: '1.2 km', address: 'Main Rd' },
          { name: 'Osmania General Hospital', distanceText: '2.5 km', address: 'Afzal Gunj' },
        ],
        groundFacts: '1. Koti Maternity Hospital (1.2 km)\n2. Osmania General Hospital (2.5 km)',
        safety: {
          constraints: ['Never name a facility not in context'],
        },
        history: [
          { role: 'user', content: 'hello' },
          { role: 'assistant', content: 'Hello Priya, how can I help today?' },
        ],
      });

      expect(prompt).toContain('[Patient]:');
      expect(prompt).toContain('pregnant_person');
      expect(prompt).toContain('Koti, Hyderabad');
      expect(prompt).toContain('[Environment]:');
      expect(prompt).toContain('37C');
      expect(prompt).toContain('[Nearby Verified Facilities]:');
      expect(prompt).toContain('Koti Maternity Hospital');
      expect(prompt).toContain('where is the nearest hospital');
    });

    it('generates grounded response via generateWithLocalLlm()', async () => {
      const modelReply = 'Hearing your baby cry continuously is exhausting and heartbreaking, Priya. Start by checking if baby is hungry, needs a diaper change, or is too warm. You can hold baby upright against your chest for gentle rocking.';
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: modelReply } }],
        }),
      });

      const result = await generateWithLocalLlm({
        userMessage: 'my baby is crying non stop',
        userName: 'Priya',
        groundFacts: 'Colic and infant crying guidance',
        safety: { riskLevel: 'low', subject: 'infant', statedAgeMonths: 3 },
        force: true,
      });

      expect(result.source).toBe('local_llm');
      expect(result.text).toContain('Hearing your baby cry continuously');
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('composeSafeResponse De-duplication & Formatting', () => {
    it('de-duplicates emergency banner if model text already contains it', () => {
      const safety = {
        riskLevel: 'emergency',
        redFlags: ['difficulty breathing'],
        emergencyActions: ['Call 112 immediately'],
      };
      const duplicatedModelText = '🚨 *This needs emergency medical care now*\n\nWhat you described (difficulty breathing) can become life-threatening quickly.\n\nKeep airways open and stay calm.';

      const result = composeSafeResponse({ safety, modelText: duplicatedModelText });
      const count = (result.match(/This needs emergency medical care now/g) || []).length;
      expect(count).toBe(1);
      expect(result).toContain('Keep airways open and stay calm.');
    });

    it('de-duplicates high-risk banner if model text already contains it', () => {
      const safety = {
        riskLevel: 'high',
        redFlags: ['high fever in newborn'],
      };
      const duplicatedModelText = '⚠️ *Please see a healthcare provider today*\n\nBecause of: high fever in newborn.\n\nDress baby lightly and consult pediatrician.';

      const result = composeSafeResponse({ safety, modelText: duplicatedModelText });
      const count = (result.match(/Please see a healthcare provider today/g) || []).length;
      expect(count).toBe(1);
      expect(result).toContain('Dress baby lightly and consult pediatrician.');
    });

    it('formats clean message when redFlags is empty without awkward placeholder', () => {
      const safety = {
        riskLevel: 'emergency',
        redFlags: [],
        emergencyActions: ['Call 112 immediately'],
      };

      const result = composeSafeResponse({ safety, modelText: 'Please seek urgent care.' });
      expect(result).not.toContain('(the symptoms you described)');
      expect(result).toContain('What you described can become life-threatening quickly.');
    });
  });
});
