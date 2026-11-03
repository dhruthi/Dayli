import { describe, it, expect } from 'vitest';
import {
  detectLocale,
  consentPrompt,
  subjectPrompt,
  childAgePrompt,
  pregnancyPrompt,
  locationPrompt,
  completionMessage,
  isSkipRequest,
  isGreeting,
  greetingReply,
  resolveLocale,
  stopConfirmation,
  advance,
  STEPS,
  ONBOARDING_IDS,
} from '../lib/onboarding.js';
import { composeMorningBrief, isDailyForecastSubscriptionQuery } from '../lib/morningBrief.js';
import { Store } from '../lib/store.js';

describe('Engagement & Multilingual Features', () => {
  describe('Language Detection', () => {
    it('detects English text by default', () => {
      expect(detectLocale('Hello there')).toBe('en');
      expect(detectLocale('My baby has a fever')).toBe('en');
    });

    it('detects Telugu script', () => {
      expect(detectLocale('నమస్కారం')).toBe('te');
      expect(detectLocale('నా బిడ్డకు జ్వరం వచ్చింది')).toBe('te');
    });

    it('detects Hindi script (Devanagari)', () => {
      expect(detectLocale('नमस्ते')).toBe('hi');
      expect(detectLocale('मेरे बच्चे को बुखार है')).toBe('hi');
    });

    it('detects Arabic script', () => {
      expect(detectLocale('مرحبا')).toBe('ar');
    });
  });

  describe('WhatsApp Character Constraints on Localized Prompts', () => {
    const locales = ['en', 'te', 'hi'];

    locales.forEach((loc) => {
      it(`enforces Meta button limits (<= 20 chars) for consent in ${loc}`, () => {
        const p = consentPrompt(loc);
        expect(p.buttons.length).toBeLessThanOrEqual(3);
        p.buttons.forEach((btn) => {
          expect(btn.title.length).toBeLessThanOrEqual(20);
        });
      });

      it(`enforces Meta list row title limits (<= 24 chars) for subject list in ${loc}`, () => {
        const p = subjectPrompt(loc);
        expect(p.sections[0].rows.length).toBeLessThanOrEqual(10);
        p.sections[0].rows.forEach((row) => {
          expect(row.title.length).toBeLessThanOrEqual(24);
        });
      });

      it(`enforces Meta list row title limits (<= 24 chars) for age list in ${loc}`, () => {
        const p = childAgePrompt(loc);
        p.sections[0].rows.forEach((row) => {
          expect(row.title.length).toBeLessThanOrEqual(24);
        });
      });

      it(`enforces Meta list row title limits (<= 24 chars) for pregnancy list in ${loc}`, () => {
        const p = pregnancyPrompt(loc);
        p.sections[0].rows.forEach((row) => {
          expect(row.title.length).toBeLessThanOrEqual(24);
        });
      });
    });
  });

  describe('Progress Steps in Onboarding', () => {
    // Onboarding is variable-length: the age/trimester screen is skipped for
    // an adult subject. Numbering it as its own step made that path count
    // 1, 2, 4 — so age/trimester is the second screen of step 2 instead.
    const stepsSeen = (locale, body) =>
      [...String(body || '').matchAll(
        locale === 'en' ? /Step (\d+) of (\d+)/g : /(?:దశ|चरण) (\d+)\/(\d+)/g
      )].map((m) => [Number(m[1]), Number(m[2])]);

    const walk = (locale, subjectId, detailId) => {
      const session = {
        profile: { locale, subjectType: 'unknown' },
        consent: { granted: false },
        onboardingStep: STEPS.CONSENT,
      };
      const seen = [];
      const record = (reply) => {
        if (!reply) return;
        seen.push(...stepsSeen(locale, `${reply.header || ''} ${reply.body || ''}`));
      };
      record(locale === 'en' ? consentPrompt('en') : consentPrompt(locale));
      let res = advance(session, { replyId: ONBOARDING_IDS.consentYes, text: '' });
      record(res.reply);
      res = advance(res.session, { replyId: subjectId, text: '' });
      record(res.reply);
      if (detailId) {
        res = advance(res.session, { replyId: detailId, text: '' });
        record(res.reply);
      }
      return seen;
    };

    for (const locale of ['en', 'te', 'hi']) {
      it(`never skips a step number on the adult path in ${locale}`, () => {
        const seen = walk(locale, `${ONBOARDING_IDS.subjPrefix}adult`, null);
        expect(seen.map(([n]) => n)).toEqual([1, 2, 3]);
        expect(seen.every(([, total]) => total === 3)).toBe(true);
      });

      it(`never skips a step number on the infant path in ${locale}`, () => {
        const seen = walk(
          locale,
          `${ONBOARDING_IDS.subjPrefix}infant`,
          `${ONBOARDING_IDS.agePrefix}6`
        );
        // Age is a second screen of step 2, so 2 repeats rather than 3 being
        // used twice or 3 being skipped.
        expect(seen.map(([n]) => n)).toEqual([1, 2, 2, 3]);
        expect(seen.every(([, total]) => total === 3)).toBe(true);
      });

      it(`never skips a step number on the pregnancy path in ${locale}`, () => {
        const seen = walk(
          locale,
          `${ONBOARDING_IDS.subjPrefix}pregnant`,
          `${ONBOARDING_IDS.pregPrefix}20`
        );
        expect(seen.map(([n]) => n)).toEqual([1, 2, 2, 3]);
      });
    }

    it('labels the final location step as the last one', () => {
      expect(locationPrompt('en').body).toContain('Step 3 of 3');
      expect(childAgePrompt('en').header).toContain('Step 2 of 3');
      expect(pregnancyPrompt('en').header).toContain('Step 2 of 3');
    });
  });

  describe('Localized Onboarding Advance Flow', () => {
    it('advances in Telugu when user interacts with Telugu text', () => {
      const session = {
        profile: { locale: 'te', subjectType: 'unknown' },
        consent: { granted: false },
        onboardingStep: STEPS.CONSENT,
      };
      const res = advance(session, { replyId: ONBOARDING_IDS.consentYes, text: '' });
      expect(res.session.consent.granted).toBe(true);
      expect(res.session.onboardingStep).toBe(STEPS.SUBJECT);
      expect(res.reply.header).toContain('దశ 2/3');
    });

    it('advances in Hindi when user interacts with Hindi text', () => {
      const session = {
        profile: { locale: 'hi', subjectType: 'unknown' },
        consent: { granted: false },
        onboardingStep: STEPS.CONSENT,
      };
      const res = advance(session, { replyId: ONBOARDING_IDS.consentYes, text: '' });
      expect(res.session.consent.granted).toBe(true);
      expect(res.session.onboardingStep).toBe(STEPS.SUBJECT);
      expect(res.reply.header).toContain('चरण 2/3');
    });

    it('generates warm completion messages with celebration emoji', () => {
      const session = {
        profile: { locale: 'en', subjectType: 'infant', location: { name: 'Hyderabad' } },
      };
      const msg = completionMessage(session);
      expect(msg.body).toContain('All set');
      expect(msg.body).toContain('Hyderabad');
      expect(msg.body).toContain('🌸');
    });
  });

  describe('Morning Brief Composition', () => {
    const climate = {
      temperature: 34,
      feelsLike: 37,
      aqi: 'Moderate',
      uvIndex: 8,
      cityName: 'Hyderabad',
    };

    it('composes English morning brief tailored to infant', () => {
      const session = {
        profile: { name: 'Yashwanth', locale: 'en', subjectType: 'infant', location: { name: 'Hyderabad' } },
      };
      const brief = composeMorningBrief(session, climate);
      expect(brief).toContain('Good morning, Yashwanth!');
      expect(brief).toContain('34°C');
      expect(brief).toContain('Hyderabad');
      expect(brief).toContain('breathable cotton');
    });

    it('composes Telugu morning brief tailored to pregnant person', () => {
      const session = {
        profile: { name: '', locale: 'te', subjectType: 'pregnant_person', location: { name: 'విజయవాడ' } },
      };
      const brief = composeMorningBrief(session, climate);
      expect(brief).toContain('శుభోదయం');
      expect(brief).toContain('విజయవాడ');
      expect(brief).toContain('కొబ్బరి నీరు');
    });

    it('composes Hindi morning brief tailored to child', () => {
      const session = {
        profile: { name: 'अमित', locale: 'hi', subjectType: 'child', location: { name: 'दिल्ली' } },
      };
      const brief = composeMorningBrief(session, climate);
      expect(brief).toContain('शुभ प्रभात, अमित!');
      expect(brief).toContain('दिल्ली');
      expect(brief).toContain('छायादार');
    });

    it('composes rich 24-hour weather prediction and time-windowed actions when forecast is present', () => {
      const climateWithForecast = {
        temperature: 28,
        feelsLike: 31,
        aqi: 'Moderate (AQI 85)',
        uvIndex: 7,
        cityName: 'Hyderabad',
        forecast: {
          cityName: 'Hyderabad',
          auroraApplied: true,
          shifts: {
            current: { temperature: 28, feelsLike: 31, aqi: 85 },
            temperature: {
              current: 28,
              max: 35,
              maxHour: '2026-10-14T09:00:00.000Z',
              min: 23,
              minHour: '2026-10-14T23:30:00.000Z',
              swing: 12,
              riseFromCurrent: 7,
            },
            heatWindow: {
              hasPeakHeat: true,
              startHour: '2026-10-14T06:30:00.000Z',
              endHour: '2026-10-14T11:00:00.000Z',
              peakFeels: 38,
            },
            rain: {
              expected: true,
              maxProb: 65,
              startHour: '2026-10-14T11:00:00.000Z',
            },
            aqi: { worsens: false },
          },
        },
      };

      const session = {
        profile: { name: 'Yashwanth', locale: 'en', subjectType: 'infant', location: { name: 'Hyderabad' } },
      };
      const brief = composeMorningBrief(session, climateWithForecast);
      expect(brief).toContain('Good morning, Yashwanth!');
      expect(brief).toContain('Hyderabad');
      expect(brief).toContain('Microsoft Aurora');
      expect(brief).toContain('climbing to a peak of 35°C');
      expect(brief).toContain('Drops overnight to 23°C');
      expect(brief).toContain('Peak Heat Window');
      expect(brief).toContain('Rain / Showers');
      expect(brief).toContain('Recommended Actions Across the 24h Window');
      expect(brief).toContain('breastmilk or formula only');
      expect(brief).toContain('breathable cotton');
    });
  });

  describe('Daily Forecast Subscription Queries', () => {
    it('detects opt-in in English, Telugu, and Hindi', () => {
      expect(isDailyForecastSubscriptionQuery('send daily forecast')).toBe('subscribe');
      expect(isDailyForecastSubscriptionQuery('forecast everyday')).toBe('subscribe');
      expect(isDailyForecastSubscriptionQuery('daily forecast please')).toBe('subscribe');
      expect(isDailyForecastSubscriptionQuery('రోజూ వాతావరణం పంపండి')).toBe('subscribe');
      expect(isDailyForecastSubscriptionQuery('రోజువారీ అంచనా')).toBe('subscribe');
      expect(isDailyForecastSubscriptionQuery('रोजाना मौसम अपडेट भेजो')).toBe('subscribe');
    });

    it('detects opt-out in English, Telugu, and Hindi', () => {
      expect(isDailyForecastSubscriptionQuery('stop daily forecast')).toBe('unsubscribe');
      expect(isDailyForecastSubscriptionQuery('unsubscribe daily')).toBe('unsubscribe');
      expect(isDailyForecastSubscriptionQuery('రోజూ వద్దు')).toBe('unsubscribe');
      expect(isDailyForecastSubscriptionQuery('रोजाना बंद करो')).toBe('unsubscribe');
    });

    it('returns null for unrelated clinical or general queries', () => {
      expect(isDailyForecastSubscriptionQuery('my baby has a cough')).toBeNull();
      expect(isDailyForecastSubscriptionQuery('where is Apollo hospital')).toBeNull();
      expect(isDailyForecastSubscriptionQuery('')).toBeNull();
    });
  });

  describe('Language switches both ways', () => {
    it('switches to a non-Latin script immediately', () => {
      expect(resolveLocale('నా బిడ్డకు జ్వరం', 'en')).toBe('te');
      expect(resolveLocale('मेरे बच्चे को बुखार है', 'en')).toBe('hi');
    });

    it('switches back to English on a real English message', () => {
      // The old rule could only move away from English, so one Telugu message
      // pinned a user to Telugu permanently.
      expect(resolveLocale('my baby has a fever', 'te')).toBe('en');
      expect(resolveLocale('hello', 'te')).toBe('en');
    });

    it('does not flip language on a short acknowledgement', () => {
      // Otherwise a Telugu speaker tapping "ok" gets answered in English.
      expect(resolveLocale('ok', 'te')).toBe('te');
      expect(resolveLocale('hi', 'te')).toBe('te');
      expect(resolveLocale('👍', 'te')).toBe('te');
      expect(resolveLocale('', 'hi')).toBe('hi');
    });

    it('defaults a brand new user to English', () => {
      expect(resolveLocale('hi', null)).toBe('en');
      expect(resolveLocale('', null)).toBe('en');
    });
  });

  describe('Bare greetings', () => {
    it('recognises a greeting on its own, in any of the languages', () => {
      for (const t of ['hi', 'Hi!', 'hey', 'hello', 'Good morning', 'హాయ్', 'नमस्ते']) {
        expect(isGreeting(t), t).toBe(true);
      }
    });

    it('does not swallow a real question that opens with a greeting', () => {
      // These must reach the model — the greeting is not the message.
      for (const t of ['hi my baby has a fever', 'hello, where is the nearest hospital']) {
        expect(isGreeting(t), t).toBe(false);
      }
    });

    it('is not confused by a symptom word', () => {
      expect(isGreeting('fever')).toBe(false);
      expect(isGreeting('')).toBe(false);
    });

    it('answers in the session language and re-opens the conversation', () => {
      const te = greetingReply({ profile: { locale: 'te', name: 'Yash Rathod' } });
      expect(te.body).toMatch(/నమస్కారం/);
      expect(te.body).toContain('Yash');
      expect(greetingReply({ profile: { locale: 'hi' } }).body).toMatch(/नमस्ते/);
      const en = greetingReply({ profile: {} });
      expect(en.body).toMatch(/Hello/);
      // It should point at what dayli does, not continue the last topic.
      expect(en.body).toMatch(/fever|weather|hospital/i);
    });
  });

  describe('Location step: skip vs a place name', () => {
    it('recognises a decline in all three languages', () => {
      for (const t of ['skip', 'Skip', 'no', 'not now', 'छोड़ें', 'వద్దు']) {
        expect(isSkipRequest(t), t).toBe(true);
      }
    });

    it('treats a real place as a place, so it can be geocoded', () => {
      // Skipton is a real town; a substring match would have swallowed it.
      for (const t of ['Hyderabad', 'Skipton', 'Kochi']) {
        expect(isSkipRequest(t), t).toBe(false);
      }
    });
  });

  describe('Store Active Users Indexing', () => {
    it('indexes consented users and removes unconsented users', async () => {
      const store = await Store.create();
      const s1 = await store.getSession('919876543210');
      s1.consent.granted = true;
      await store.saveSession('919876543210', s1);

      const users = await store.getActiveUsers();
      expect(users).toContain('919876543210');

      s1.consent.granted = false;
      await store.saveSession('919876543210', s1);
      const updatedUsers = await store.getActiveUsers();
      expect(updatedUsers).not.toContain('919876543210');
    });
  });
});
