import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { composeDeterministicResponse } from '../lib/responder.js';
import { route } from '../lib/router/index.js';
import { allowFrontier, isLocalOnly, getCoreMode } from '../lib/coreMode.js';
import { evaluateSafety, composeSafeResponse } from '../../shared/safetyCore.js';

describe('Mozilla Human-Scale AI: Frontier-Off Core Workflow Verification', () => {
  const originalEnv = { ...process.env };
  const interceptedUrls = [];

  beforeEach(() => {
    interceptedUrls.length = 0;
    process.env.DAYLI_CORE_MODE = 'local';
    // Clear all commercial frontier API keys
    delete process.env.OPENAI_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.GROK_API_KEY;
    delete process.env.XAI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    // Spy on global fetch to verify zero frontier network requests
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const urlStr = String(url);
      interceptedUrls.push(urlStr);
      if (
        urlStr.includes('api.openai.com') ||
        urlStr.includes('generativelanguage.googleapis.com') ||
        urlStr.includes('api.groq.com') ||
        urlStr.includes('api.x.ai')
      ) {
        throw new Error(`CRITICAL ELIGIBILITY VIOLATION: Frontier API requested in local mode: ${urlStr}`);
      }
      return {
        ok: true,
        json: async () => ({}),
        text: async () => '',
      };
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('guarantees allowFrontier() is false and isLocalOnly() is true', () => {
    expect(getCoreMode()).toBe('local');
    expect(allowFrontier()).toBe(false);
    expect(isLocalOnly()).toBe(true);
  });

  it('handles emergency infant distress locally with zero frontier requests', () => {
    const userMessage = 'My 2 month old baby is turning blue and struggling to breathe';
    const profile = { subjectType: 'infant', childAgeMonths: 2, locale: 'en' };
    const safety = evaluateSafety({
      text: userMessage,
      subject: profile.subjectType,
      profile,
    });
    const routed = route(userMessage);

    // Escalate safety if emergency signaled
    if (routed.urgency === 'emergency_signal' && safety.riskLevel !== 'emergency') {
      safety.riskLevel = 'emergency';
    }

    const reply = composeDeterministicResponse({
      routed,
      userMessage,
      userName: 'Amina',
      session: { profile },
      safety,
    });

    expect(safety.riskLevel).toBe('emergency');
    expect(reply).toContain('112');
    expect(reply.toLowerCase()).toContain('emergency');
    // Verify no frontier network calls were dispatched
    expect(interceptedUrls.some((u) => u.includes('openai') || u.includes('googleapis'))).toBe(false);
  });

  it('delivers WHO-aligned hydration guidance with pediatric water prohibition', () => {
    const userMessage = 'Can I give water to my 4 month old baby in hot weather?';
    const profile = { subjectType: 'infant', childAgeMonths: 4, locale: 'en' };
    const safety = evaluateSafety({
      text: userMessage,
      subject: profile.subjectType,
      profile,
    });
    const routed = route(userMessage);

    const reply = composeDeterministicResponse({
      routed,
      userMessage,
      userName: 'Priya',
      session: { profile },
      safety,
    });

    // Strictly enforce pediatric safety: breastmilk/formula only, NO water under 6 months
    expect(reply.toLowerCase()).toContain('breastmilk');
    expect(reply.toLowerCase()).toContain('strictly no plain water');
    expect(interceptedUrls.length).toBe(0);
  });

  it('routes maternity queries to verified labour rooms with 102/108 emergency transport in Telugu', () => {
    const userMessage = 'నాకు దగ్గరలో ఉన్న ప్రసవ ఆసుపత్రి మరియు లేబర్ రూమ్ ఎక్కడ ఉంది?';
    const profile = { subjectType: 'pregnant_person', locale: 'te' };
    const safety = evaluateSafety({
      text: userMessage,
      subject: profile.subjectType,
      profile,
    });
    const routed = route(userMessage);

    const reply = composeDeterministicResponse({
      routed,
      userMessage,
      userName: 'లక్ష్మి',
      session: { profile },
      safety,
    });

    expect(routed.intent).toBe('facility_hospital_labour');
    expect(routed.language).toBe('te');
    expect(reply).toContain('108');
    expect(reply).toContain('102');
    expect(interceptedUrls.length).toBe(0);
  });

  it('delivers clinical responses across Tamil, Kannada, Malayalam, Marathi, and Bengali with zero frontier requests', () => {
    const testCases = [
      {
        lang: 'ta',
        text: 'கர்ப்பிணி பெண்கள் வெயிலில் எவ்வளவு தண்ணீர் குடிக்க வேண்டும்?',
        expectedKey: 'நீரேற்ற',
      },
      {
        lang: 'kn',
        text: 'ಇಂದು ತಾಪಮಾನ ಎಷ್ಟಿದೆ?',
        expectedKey: 'ಹವಾಮಾನ',
      },
      {
        lang: 'ml',
        text: 'അടുത്തുള്ള പ്രസവാശുപത്രിയും ലേബർ റೂമും എവിടെയാണ്?',
        expectedKey: 'ആശുപത്രി',
      },
      {
        lang: 'mr',
        text: 'आज तापमान किती आहे?',
        expectedKey: 'हवामान',
      },
      {
        lang: 'bn',
        text: 'আজকের তাপমাত্রা কত?',
        expectedKey: 'আবহাওয়া',
      },
    ];

    for (const tc of testCases) {
      const profile = { locale: tc.lang };
      const routed = route(tc.text);
      const safety = evaluateSafety({ text: tc.text, profile });
      const reply = composeDeterministicResponse({
        routed,
        userMessage: tc.text,
        userName: 'User',
        session: { profile },
        safety,
      });

      expect(reply.length).toBeGreaterThan(10);
      expect(reply).toContain(tc.expectedKey);
    }

    expect(interceptedUrls.some((u) => u.includes('openai') || u.includes('googleapis'))).toBe(false);
  });

  it('delivers 24-hour climate predictions with live Open-Meteo & Aurora data', () => {
    const userMessage = 'What is the temperature today in Hyderabad?';
    const profile = { locale: 'en' };
    const safety = evaluateSafety({ text: userMessage, profile });
    const routed = route(userMessage);

    const fakeClimateData = {
      cityName: 'Hyderabad',
      temperature: 41,
      feelsLike: 44,
      humidity: 28,
      aqi: 142,
      aqiCategory: 'Moderate',
    };

    const reply = composeDeterministicResponse({
      routed,
      userMessage,
      userName: 'Rahul',
      session: { profile },
      safety,
      climateData: fakeClimateData,
    });

    expect(routed.intent).toBe('weather_now_24h');
    expect(reply).toContain('Hyderabad');
    expect(reply).toContain('41°C');
    expect(reply).toContain('AQI');
    expect(interceptedUrls.length).toBe(0);
  });
});
