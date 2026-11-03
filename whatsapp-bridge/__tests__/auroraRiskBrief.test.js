import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateAuroraRiskBrief } from '../lib/auroraRiskBrief.js';

describe('Aurora Personalized Climate Risk Brief (lib/auroraRiskBrief.js)', () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.GEMINI_API_KEY = originalKey;
    vi.restoreAllMocks();
  });

  it('returns null if GEMINI_API_KEY is not set', async () => {
    process.env.GEMINI_API_KEY = '';
    const result = await generateAuroraRiskBrief({
      forecast: { summary: 'Hot day', risk: { heatLevel: 'high' } },
      profile: { locale: 'en', subjectType: 'infant' },
      cityName: 'Hyderabad',
    });
    expect(result).toBeNull();
  });

  it('returns null if forecast is missing', async () => {
    const result = await generateAuroraRiskBrief({
      forecast: null,
      profile: { locale: 'en' },
      cityName: 'Hyderabad',
    });
    expect(result).toBeNull();
  });

  it('correctly constructs Gemini prompt with Telugu instruction and returns brief', async () => {
    const fakeForecast = {
      summary: 'Peak temp: 42°C, AQI: 160',
      risk: { heatLevel: 'extreme', aqiLevel: 'unhealthy' },
    };

    let capturedUrl = '';
    let capturedBody = null;

    global.fetch = vi.fn(async (url, options) => {
      capturedUrl = url;
      capturedBody = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: 'హైదరాబాద్‌లో ఈరోజు మధ్యాహ్నం 42°C వరకు ఎండ పెరిగే అవకాశం ఉంది. శిశువును బయటకు తీసుకురావద్దు.',
                  },
                ],
              },
            },
          ],
        }),
      };
    });

    const brief = await generateAuroraRiskBrief({
      forecast: fakeForecast,
      profile: { locale: 'te', subjectType: 'infant', childAgeMonths: 4 },
      cityName: 'Hyderabad',
    });

    expect(brief).toContain('హైదరాబాద్‌లో ఈరోజు మధ్యాహ్నం 42°C వరకు ఎండ పెరిగే అవకాశం ఉంది');
    expect(capturedUrl).toContain('models/gemini-2.0-flash:generateContent');
    expect(capturedUrl).toContain('key=test-gemini-key');

    const promptText = capturedBody.contents[0].parts[0].text;
    expect(promptText).toContain('Telugu script');
    expect(promptText).toContain('an infant under 12 months');
    expect(promptText).toContain('(4 months old)');
    expect(promptText).toContain('NO plain water');
  });

  it('adapts to Hindi for pregnant mothers', async () => {
    const fakeForecast = {
      summary: 'Peak temp: 40°C',
      risk: { heatLevel: 'high', aqiLevel: 'moderate' },
    };

    let promptText = '';

    global.fetch = vi.fn(async (url, options) => {
      const body = JSON.parse(options.body);
      promptText = body.contents[0].parts[0].text;
      return {
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'गर्भावस्था में हाइड्रेशन का ध्यान रखें।' }] } }],
        }),
      };
    });

    await generateAuroraRiskBrief({
      forecast: fakeForecast,
      profile: { locale: 'hi', subjectType: 'pregnant_person' },
      cityName: 'Jaipur',
    });

    expect(promptText).toContain('Hindi');
    expect(promptText).toContain('a pregnant mother');
    expect(promptText).toContain('Jaipur');
  });

  it('handles Gemini 500 error gracefully by returning null', async () => {
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    }));

    const result = await generateAuroraRiskBrief({
      forecast: { summary: 'Hot', risk: { heatLevel: 'high' } },
      profile: { locale: 'en' },
      cityName: 'Delhi',
    });

    expect(result).toBeNull();
  });
});
