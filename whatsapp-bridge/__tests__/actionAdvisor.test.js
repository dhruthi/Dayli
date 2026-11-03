import { describe, it, expect } from 'vitest';
import {
  getSubjectActions,
  compose5DayOutlook,
  composeSimpleWeatherAdvice,
  compose24HourWeatherChangeAdvice,
} from '../lib/actionAdvisor.js';

describe('Deterministic Clinical Action Advisor (lib/actionAdvisor.js)', () => {
  describe('getSubjectActions', () => {
    it('strictly forbids plain water for infants under 6 months in English', () => {
      const actions = getSubjectActions('infant', 'extreme', false, 'en');
      expect(actions.some((a) => a.includes('Do NOT give plain water under 6 months'))).toBe(true);
      expect(actions.some((a) => a.includes('Offer frequent breastfeeds/formula'))).toBe(true);
    });

    it('strictly forbids plain water for infants under 6 months in Telugu', () => {
      const actions = getSubjectActions('infant', 'high', false, 'te');
      expect(actions.some((a) => a.includes('6 నెలల లోపు వయస్సు ఉన్నవారికి ఎట్టి పరిస్థితుల్లోనూ మంచినీరు ఇవ్వవద్దు'))).toBe(true);
      expect(actions.some((a) => a.includes('తల్లిపాలు'))).toBe(true);
    });

    it('strictly forbids plain water for infants under 6 months in Hindi', () => {
      const actions = getSubjectActions('infant', 'high', false, 'hi');
      expect(actions.some((a) => a.includes('6 माह से कम उम्र के शिशु को सादा पानी बिल्कुल न दें'))).toBe(true);
      expect(actions.some((a) => a.includes('स्तनपान'))).toBe(true);
    });

    it('provides pregnancy-specific heat safeguards', () => {
      const actions = getSubjectActions('pregnant_person', 'extreme', false, 'en');
      expect(actions.some((a) => a.includes('tender coconut water') || a.includes('buttermilk'))).toBe(true);
      expect(actions.some((a) => a.includes('Avoid outdoor travel or direct sun exposure'))).toBe(true);
      expect(actions.some((a) => a.includes('Seek immediate medical care'))).toBe(true);
    });

    it('provides child-specific play and hydration precautions', () => {
      const actions = getSubjectActions('child', 'high', false, 'en');
      expect(actions.some((a) => a.includes('before 10:00 AM or after 5:00 PM'))).toBe(true);
      expect(actions.some((a) => a.includes('water breaks every 30 minutes'))).toBe(true);
    });

    it('appends mosquito prevention advice when rain is forecast', () => {
      const actionsWithRain = getSubjectActions('infant', 'caution', true, 'en');
      expect(actionsWithRain.some((a) => a.includes('stagnant water') && a.includes('mosquito'))).toBe(true);
    });

    it('defaults gracefully to English adult actions for unrecognized locale or subject', () => {
      const actions = getSubjectActions('unknown_subject', 'normal', false, 'unknown_locale');
      expect(actions.length).toBeGreaterThan(0);
      expect(actions.some((a) => a.includes('2.5–3 liters of water daily'))).toBe(true);
    });
  });

  describe('compose5DayOutlook', () => {
    const sampleForecast = {
      cityName: 'Hyderabad',
      lat: 17.385,
      lon: 78.486,
      isAuroraCovered: true,
      hasHeatwaveStreak: true,
      days: [
        {
          date: '2026-05-15',
          dayName: 'Friday',
          maxTemp: 42.5,
          minTemp: 28.0,
          uvMax: 10.0,
          rainProb: 10,
          riskLevel: 'extreme',
          source: 'Microsoft Aurora (0.25° Regional Box) + Open-Meteo',
        },
        {
          date: '2026-05-16',
          dayName: 'Saturday',
          maxTemp: 43.0,
          minTemp: 29.0,
          uvMax: 10.5,
          rainProb: 15,
          riskLevel: 'extreme',
          source: 'Microsoft Aurora (0.25° Regional Box) + Open-Meteo',
        },
        {
          date: '2026-05-17',
          dayName: 'Sunday',
          maxTemp: 39.0,
          minTemp: 27.5,
          uvMax: 9.0,
          rainProb: 60,
          riskLevel: 'high',
          source: 'Microsoft Aurora (0.25° Regional Box) + Open-Meteo',
        },
      ],
    };

    it('returns fallback message when forecast data is null or empty', () => {
      expect(compose5DayOutlook(null)).toContain('currently unavailable');
      expect(compose5DayOutlook({ days: [] })).toContain('currently unavailable');
    });

    it('formats a complete English WhatsApp message with heatwave alert and Aurora attribution', () => {
      const output = compose5DayOutlook(sampleForecast, { locale: 'en', subjectType: 'infant' });

      expect(output).toContain('5-Day Climate Health Outlook');
      expect(output).toContain('Microsoft Aurora 0.25°');
      expect(output).toContain('⚠️ Heatwave Warning');
      expect(output).toContain('Friday (05-15): 🚨 Max 42.5°C / Min 28°C');
      expect(output).toContain('Sunday (05-17): ⚠️ Max 39°C / Min 27.5°C · Rain: 60%');
      expect(output).toContain('Recommended Actions for (infant)');
      expect(output).toContain('Do NOT give plain water under 6 months');
      expect(output).toContain('Guidance only, not a medical diagnosis. For health emergencies, call 112.');
    });

    it('formats localized Telugu output correctly', () => {
      const output = compose5DayOutlook(sampleForecast, { locale: 'te', subjectType: 'pregnant_person' });

      expect(output).toContain('5-రోజుల వాతావరణ మరియు ఆరోగ్య సూచనలు');
      expect(output).toContain('తీవ్రమైన ఎండ హెచ్చరిక');
      expect(output).toContain('తీసుకోవలసిన ముఖ్య జాగ్రత్తలు');
      expect(output).toContain('112 కు కాల్ చేయండి');
    });

    it('formats localized Hindi output correctly', () => {
      const output = compose5DayOutlook(sampleForecast, { locale: 'hi', subjectType: 'child' });

      expect(output).toContain('5-दिवसीय मौसम एवं स्वास्थ्य मार्गदर्शन');
      expect(output).toContain('लू (हीटवेव) की चेतावनी');
      expect(output).toContain('आवश्यक सुरक्षा कदम');
      expect(output).toContain('112 पर कॉल करें');
    });
  });

  describe('composeSimpleWeatherAdvice', () => {
    const sampleForecast = {
      cityName: 'Hyderabad',
      lat: 17.385,
      lon: 78.486,
      isAuroraCovered: true,
      hasHeatwaveStreak: true,
      days: [
        {
          date: '2026-05-15',
          dayName: 'Friday',
          maxTemp: 42.5,
          minTemp: 28.0,
          uvMax: 10.0,
          rainProb: 10,
          riskLevel: 'extreme',
        },
        {
          date: '2026-05-16',
          dayName: 'Saturday',
          maxTemp: 43.0,
          minTemp: 29.0,
          uvMax: 10.5,
          rainProb: 15,
          riskLevel: 'extreme',
        },
        {
          date: '2026-05-17',
          dayName: 'Sunday',
          maxTemp: 39.0,
          minTemp: 27.5,
          uvMax: 9.0,
          rainProb: 65,
          riskLevel: 'high',
        },
      ],
    };

    it('returns a concise, action-focused recommendation for an infant query', () => {
      const output = composeSimpleWeatherAdvice(sampleForecast, { locale: 'en' }, 'How is the weather for my baby?');

      // Brief summary
      expect(output).toContain('Upcoming Weather (Hyderabad)');
      expect(output).toContain('43°C');
      expect(output).toContain('Saturday');
      // Simple actions
      expect(output).toContain('Recommended Actions');
      expect(output).toContain('Do NOT give plain water under 6 months');
      expect(output).toContain('112');
      // Ensures it does NOT dump the spreadsheet daily rows
      expect(output).not.toContain('• Friday (05-15):');
    });

    it('formats a concise Telugu recommendation for pregnancy', () => {
      const output = composeSimpleWeatherAdvice(sampleForecast, { locale: 'te' }, 'గర్భిణీ స్త్రీలకు ఈ ఎండలో ఏ జాగ్రత్తలు తీసుకోవాలి?');

      expect(output).toContain('వాతావరణ సూచన (Hyderabad)');
      expect(output).toContain('తీసుకోవలసిన ముఖ్య జాగ్రత్తలు');
      expect(output).toContain('కొబ్బరి నీరు, మజ్జిగ');
      expect(output).toContain('112');
    });

    it('formats a concise Hindi recommendation for child outdoor activities', () => {
      const output = composeSimpleWeatherAdvice(sampleForecast, { locale: 'hi' }, 'क्या बच्चे को बाहर खेलने भेज सकते हैं?');

      expect(output).toContain('मौसम की स्थिति (Hyderabad)');
      expect(output).toContain('आवश्यक सुरक्षा कदम');
      expect(output).toContain('बच्चों को दोपहर की धूप में बाहर न खेलने दें');
      expect(output).toContain('112');
    });

    it('adapts actions when user explicitly asks about rain', () => {
      const output = composeSimpleWeatherAdvice(sampleForecast, { locale: 'en' }, 'Will it rain this week?');

      expect(output).toContain('umbrella');
      expect(output).toContain('stagnant water');
    });
  });

  describe('compose24HourWeatherChangeAdvice', () => {
    const sample24hForecast = {
      cityName: 'Hyderabad',
      shifts: {
        current: { temperature: 27.5, feelsLike: 29.0 },
        temperature: {
          current: 27.5,
          max: 35.0,
          maxHour: '2026-05-15T14:30',
          min: 22.0,
          minHour: '2026-05-16T05:00',
          swing: 13.0,
          riseFromCurrent: 7.5,
        },
        heatWindow: {
          hasPeakHeat: true,
          startHour: '2026-05-15T12:00',
          endHour: '2026-05-15T16:30',
          peakFeels: 38.5,
        },
        rain: {
          expected: true,
          maxProb: 65,
          startHour: '2026-05-15T17:00',
        },
        aqi: {
          current: 60,
          peak: 140,
          peakHour: '2026-05-15T20:00',
          worsens: true,
        },
      },
    };

    it('generates English 24-hour weather shift guidance with infant safety constraints', () => {
      const output = compose24HourWeatherChangeAdvice(sample24hForecast, { locale: 'en' }, 'What is the weather change for my baby?');

      expect(output).toContain('Next 24-Hour Weather Shifts (Hyderabad)');
      expect(output).toContain('Currently 27.5°C');
      expect(output).toContain('35°C');
      expect(output).toContain('Peak Heat Window');
      expect(output).toContain('Rain / Showers');
      expect(output).toContain('NO plain water under 6 months');
      expect(output).toContain('112');
    });

    it('generates Telugu 24-hour weather shift guidance for pregnant women', () => {
      const output = compose24HourWeatherChangeAdvice(sample24hForecast, { locale: 'te' }, 'గర్భిణీలకు 24 గంటల వాతావరణం ఎలా ఉంటుంది?');

      expect(output).toContain('రాబోయే 24 గంటల వాతావరణ మార్పులు (Hyderabad)');
      expect(output).toContain('27.5°C');
      expect(output).toContain('35°C');
      expect(output).toContain('ఎండ తీవ్రత');
      expect(output).toContain('సమయానుకూలంగా తీసుకోవలసిన జాగ్రత్తలు');
      expect(output).toContain('కొబ్బరి నీరు, మజ్జిగ');
      expect(output).toContain('112');
    });

    it('generates Hindi 24-hour weather shift guidance for children', () => {
      const output = compose24HourWeatherChangeAdvice(sample24hForecast, { locale: 'hi' }, 'अगले 24 घंटे में बच्चों के लिए मौसम कैसा रहेगा?');

      expect(output).toContain('अगले 24 घंटों में मौसम का बदलाव (Hyderabad)');
      expect(output).toContain('27.5°C');
      expect(output).toContain('35°C');
      expect(output).toContain('कड़ी धूप का समय');
      expect(output).toContain('समय अनुसार आवश्यक सावधानियां');
      expect(output).toContain('112');
    });

    it('includes Aurora provenance badge and morning window recommendations when auroraApplied is true', () => {
      const aurora24hForecast = {
        ...sample24hForecast,
        auroraApplied: true,
      };
      const output = compose24HourWeatherChangeAdvice(aurora24hForecast, { locale: 'en' }, 'Predict weather and give recommended actions for next 24 hours');

      expect(output).toContain('[Microsoft Aurora + Open-Meteo]');
      expect(output).toContain('Morning (before 11:00 AM)');
      expect(output.toLowerCase()).toContain('during 12:00 pm–4:30 pm');
      expect(output.toLowerCase()).toContain('after 5:00 pm');
      expect(output).toContain('Recommended Actions Across the 24h Window');
    });

    it('handles null forecast safely', () => {
      const output = compose24HourWeatherChangeAdvice(null, { locale: 'en' });
      expect(output).toContain('currently unavailable');
    });
  });
});

