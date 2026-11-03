import { describe, it, expect } from 'vitest';
import {
  matchSymptomTrigger,
  symptomPrompt,
  symptomAnswer,
  subjectNoun,
} from '../lib/onboarding.js';
import { composeFirstTip, subjectTip } from '../lib/morningBrief.js';

describe('Interactive symptom checker', () => {
  describe('trigger matching', () => {
    it('matches a bare symptom word in English', () => {
      expect(matchSymptomTrigger('fever')).toBe('fever');
      expect(matchSymptomTrigger('crying')).toBe('crying');
      expect(matchSymptomTrigger('heat')).toBe('heat');
    });

    it('is case and punctuation insensitive', () => {
      expect(matchSymptomTrigger('  Fever? ')).toBe('fever');
      expect(matchSymptomTrigger('HEAT.')).toBe('heat');
    });

    it('matches Indian language symptom words across all 8 languages', () => {
      expect(matchSymptomTrigger('జ్వరం')).toBe('fever'); // Telugu
      expect(matchSymptomTrigger('बुखार')).toBe('fever'); // Hindi
      expect(matchSymptomTrigger('காய்ச்சல்')).toBe('fever'); // Tamil
      expect(matchSymptomTrigger('ಜ್ವರ')).toBe('fever'); // Kannada
      expect(matchSymptomTrigger('പനി')).toBe('fever'); // Malayalam
      expect(matchSymptomTrigger('ताप')).toBe('fever'); // Marathi
      expect(matchSymptomTrigger('জ্বর')).toBe('fever'); // Bengali
      expect(matchSymptomTrigger('ఏడుపు')).toBe('crying');
      expect(matchSymptomTrigger('गर्मी')).toBe('heat');
    });

    it('does not hijack a question that already carries detail', () => {
      expect(matchSymptomTrigger('my baby has a fever and is not feeding')).toBeNull();
      expect(matchSymptomTrigger('is this heat safe for my newborn')).toBeNull();
    });

    it('ignores empty and unrelated input', () => {
      expect(matchSymptomTrigger('')).toBeNull();
      expect(matchSymptomTrigger(null)).toBeNull();
      expect(matchSymptomTrigger('hello')).toBeNull();
    });
  });

  describe('prompts', () => {
    for (const topic of ['fever', 'crying', 'heat']) {
      for (const locale of ['en', 'hi', 'te', 'ta', 'kn', 'ml', 'mr', 'bn']) {
        it(`builds a 3-button ${topic} prompt in ${locale}`, () => {
          const p = symptomPrompt(topic, locale);
          expect(p.kind).toBe('buttons');
          expect(p.body.length).toBeGreaterThan(0);
          expect(p.buttons).toHaveLength(3);
          for (const b of p.buttons) {
            // Meta rejects reply-button titles over 20 characters.
            expect(b.title.length).toBeLessThanOrEqual(20);
            expect(b.id.startsWith('sym_')).toBe(true);
          }
        });
      }
    }

    it('falls back to English for an unsupported locale', () => {
      expect(symptomPrompt('fever', 'ar').body).toBe(symptomPrompt('fever', 'en').body);
    });

    it('returns null for an unknown topic', () => {
      expect(symptomPrompt('nosebleed', 'en')).toBeNull();
    });
  });

  describe('button answers', () => {
    it('maps every button id in every prompt to an English question', () => {
      for (const topic of ['fever', 'crying', 'heat']) {
        for (const b of symptomPrompt(topic, 'te').buttons) {
          expect(symptomAnswer(b.id)).toBeTruthy();
        }
      }
    });

    it('keeps the age detail that safety routing depends on', () => {
      expect(symptomAnswer('sym_fever_under3m')).toMatch(/under 3 months/i);
    });

    it('returns null for a non-symptom reply id', () => {
      expect(symptomAnswer('ob_consent_yes')).toBeNull();
      expect(symptomAnswer('')).toBeNull();
    });

    it('does not re-trigger the checker with its own answer', () => {
      expect(matchSymptomTrigger(symptomAnswer('sym_fever_older'))).toBeNull();
    });
  });
});

describe('Localized subject nouns', () => {
  it('stays in one language per locale across all supported Indian languages', () => {
    expect(subjectNoun('infant', 'en')).toBe('your baby');
    expect(subjectNoun('infant', 'te')).not.toMatch(/[a-z]/i);
    expect(subjectNoun('infant', 'hi')).not.toMatch(/[a-z]/i);
    expect(subjectNoun('infant', 'ta')).toBe('உங்கள் குழந்தை');
    expect(subjectNoun('infant', 'kn')).toBe('ನಿಮ್ಮ ಮಗು');
    expect(subjectNoun('infant', 'ml')).toBe('നിങ്ങളുടെ കുഞ്ഞ്');
    expect(subjectNoun('infant', 'mr')).toBe('तुमचे बाळ');
    expect(subjectNoun('infant', 'bn')).toBe('আপনার শিশু');
  });

  it('falls back for unknown subjects and locales', () => {
    expect(subjectNoun('unknown', 'en')).toBe('you');
    expect(subjectNoun('postpartum_person', 'en')).toBe('you');
    expect(subjectNoun('infant', 'ar')).toBe('your baby');
  });
});

describe('Onboarding first tip', () => {
  const session = (profile) => ({ profile });

  it('includes live weather and a profile-specific tip', () => {
    const body = composeFirstTip(
      session({ subjectType: 'infant', locale: 'en', location: { name: 'Hyderabad' } }),
      { temperature: 39, feelsLike: 42, cityName: 'Hyderabad' }
    );
    expect(body).toContain('Hyderabad');
    expect(body).toContain('39');
    expect(body).toContain('42');
    expect(body).toContain(subjectTip({ subjectType: 'infant' }, 'en'));
  });

  it('degrades to a profile-only tip when weather is unavailable', () => {
    const body = composeFirstTip(session({ subjectType: 'child', locale: 'en' }), null);
    expect(body).toContain(subjectTip({ subjectType: 'child' }, 'en'));
    expect(body).not.toContain('°C');
  });

  it('is delivered in the user\'s language', () => {
    const te = composeFirstTip(
      session({ subjectType: 'pregnant_person', locale: 'te' }),
      { temperature: 38, feelsLike: 40 }
    );
    expect(te).toContain(subjectTip({ subjectType: 'pregnant_person' }, 'te'));
    const hi = composeFirstTip(session({ subjectType: 'infant', locale: 'hi' }), null);
    expect(hi).toContain(subjectTip({ subjectType: 'infant' }, 'hi'));
  });

  it('gives a hydration tip when the subject is still unknown', () => {
    expect(composeFirstTip(session({ locale: 'en' }), null)).toContain('hydrated');
  });
});
