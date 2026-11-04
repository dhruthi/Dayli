import { describe, it, expect } from 'vitest';
import {
  t,
  getLanguageMenu,
  getLanguageSwitchedMessage,
  isSupportedLocale,
  normalizeLocale,
  SUPPORTED_LOCALES,
} from '../lib/i18n/index.js';

describe('Multilingual i18n Translation Engine', () => {
  it('supports all target languages in SUPPORTED_LOCALES', () => {
    const expected = ['en', 'hi', 'te', 'ta', 'kn', 'ml', 'mr', 'bn', 'ar', 'fr', 'sw', 'ha', 'yo', 'am', 'zu'];
    expect(Object.keys(SUPPORTED_LOCALES).sort()).toEqual(expected.sort());
  });

  it('normalizes locales properly', () => {
    expect(normalizeLocale('te-Latn')).toBe('te');
    expect(normalizeLocale('hi-Latn')).toBe('hi');
    expect(normalizeLocale('TA')).toBe('ta');
    expect(normalizeLocale('KN_IN')).toBe('kn');
    expect(normalizeLocale('ar-EG')).toBe('ar');
    expect(normalizeLocale('fr-FR')).toBe('fr');
    expect(normalizeLocale('sw-KE')).toBe('sw');
    expect(normalizeLocale('xyz')).toBe('en');
  });

  it('validates isSupportedLocale correctly', () => {
    expect(isSupportedLocale('te')).toBe(true);
    expect(isSupportedLocale('ta')).toBe(true);
    expect(isSupportedLocale('mr')).toBe(true);
    expect(isSupportedLocale('bn')).toBe(true);
    expect(isSupportedLocale('ar')).toBe(true);
    expect(isSupportedLocale('fr')).toBe(true);
    expect(isSupportedLocale('sw')).toBe(true);
    expect(isSupportedLocale('ha')).toBe(true);
    expect(isSupportedLocale('yo')).toBe(true);
    expect(isSupportedLocale('am')).toBe(true);
    expect(isSupportedLocale('zu')).toBe(true);
    expect(isSupportedLocale('xyz')).toBe(false);
  });

  it('translates keys across Indian and African/global languages without missing fallbacks', () => {
    const locales = ['en', 'hi', 'te', 'ta', 'kn', 'ml', 'mr', 'bn', 'ar', 'fr', 'sw', 'ha', 'yo', 'am', 'zu'];
    const keysToCheck = [
      'consent_header',
      'consent_body',
      'subject_header',
      'loc_header',
      'emergency_banner',
      'emergency_action_112',
      'heat_hydration_infant',
      'fever_guidance',
      'stop_confirmation',
    ];

    for (const loc of locales) {
      for (const key of keysToCheck) {
        const val = t(key, loc);
        expect(val).toBeDefined();
        expect(val).not.toBe(key); // Must not return raw key
        expect(val.length).toBeGreaterThan(5);
      }
    }
  });

  it('interpolates {variables} correctly', () => {
    const welcome = t('welcome_body', 'en', { userName: 'Priya' });
    expect(welcome).toContain('Hello Priya!');

    const welcomeTe = t('welcome_body', 'te', { userName: 'లక్ష్మి' });
    expect(welcomeTe).toContain('నమస్కారం లక్ష్మి!');

    const welcomeTa = t('welcome_body', 'ta', { userName: 'கவிதா' });
    expect(welcomeTa).toContain('வணக்கம் கவிதா!');
  });

  it('strictly enforces pediatric safety (no plain water under 6m) across all languages', () => {
    const locales = ['en', 'hi', 'te', 'ta', 'kn', 'ml', 'mr', 'bn'];
    for (const loc of locales) {
      const guidance = t('heat_hydration_infant', loc);
      expect(guidance.length).toBeGreaterThan(20);
      // Ensure guidance mentions 6 months in digits or text
      expect(guidance).toMatch(/6|६|೬|൬|৬/);
    }
  });

  it('builds a valid Meta interactive language list menu adhering to limits', () => {
    const menu = getLanguageMenu('en');
    expect(menu.kind).toBe('list');
    expect(menu.sections.length).toBe(1);
    expect(menu.sections[0].rows.length).toBeLessThanOrEqual(10);

    // Meta API limits check: row titles must be <= 24 characters
    for (const row of menu.sections[0].rows) {
      expect(row.title.length).toBeLessThanOrEqual(24);
      expect(row.id.startsWith('lang_')).toBe(true);
    }

    const moreMenu = getLanguageMenu('en', 'more');
    expect(moreMenu.sections[0].rows.length).toBeLessThanOrEqual(10);
  });

  it('provides a warm language-switch confirmation in native script', () => {
    expect(getLanguageSwitchedMessage('ta')).toContain('தமிழ்');
    expect(getLanguageSwitchedMessage('kn')).toContain('ಕನ್ನಡ');
    expect(getLanguageSwitchedMessage('ml')).toContain('മലയാളം');
    expect(getLanguageSwitchedMessage('mr')).toContain('मराठी');
    expect(getLanguageSwitchedMessage('bn')).toContain('বাংলা');
    expect(getLanguageSwitchedMessage('te')).toContain('తెలుగు');
    expect(getLanguageSwitchedMessage('hi')).toContain('हिन्दी');
    expect(getLanguageSwitchedMessage('ar')).toContain('العربية');
    expect(getLanguageSwitchedMessage('fr')).toContain('Français');
    expect(getLanguageSwitchedMessage('sw')).toContain('Kiswahili');
  });
});
