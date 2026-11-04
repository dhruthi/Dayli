/**
 * Dayli AI — Multilingual Locale Registry
 * Phase 1: 8 Indian Languages + English
 */

export const SUPPORTED_LOCALES = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    script: 'latin',
    bhashiniCode: 'en',
    metaCode: 'en',
    flag: '🇬🇧',
    greeting: 'Hello',
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    script: 'devanagari',
    bhashiniCode: 'hi',
    metaCode: 'hi',
    flag: '🇮🇳',
    greeting: 'नमस्ते',
  },
  te: {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    script: 'telugu',
    bhashiniCode: 'te',
    metaCode: 'te',
    flag: '🇮🇳',
    greeting: 'నమస్కారం',
  },
  ta: {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    script: 'tamil',
    bhashiniCode: 'ta',
    metaCode: 'ta',
    flag: '🇮🇳',
    greeting: 'வணக்கம்',
  },
  kn: {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    script: 'kannada',
    bhashiniCode: 'kn',
    metaCode: 'kn',
    flag: '🇮🇳',
    greeting: 'ನಮಸ್ಕಾರ',
  },
  ml: {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    script: 'malayalam',
    bhashiniCode: 'ml',
    metaCode: 'ml',
    flag: '🇮🇳',
    greeting: 'നമസ്കാരം',
  },
  mr: {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    script: 'devanagari',
    bhashiniCode: 'mr',
    metaCode: 'mr',
    flag: '🇮🇳',
    greeting: 'नमस्कार',
  },
  bn: {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    script: 'bengali',
    bhashiniCode: 'bn',
    metaCode: 'bn',
    flag: '🇮🇳',
    greeting: 'নমস্কার',
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    script: 'arabic',
    bhashiniCode: null,
    metaCode: 'ar',
    flag: '🌍',
    greeting: 'مرحباً',
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    script: 'latin',
    bhashiniCode: null,
    metaCode: 'fr',
    flag: '🌍',
    greeting: 'Bonjour',
  },
  sw: {
    code: 'sw',
    name: 'Swahili',
    nativeName: 'Kiswahili',
    script: 'latin',
    bhashiniCode: null,
    metaCode: 'sw',
    flag: '🇰🇪',
    greeting: 'Habari',
  },
  ha: {
    code: 'ha',
    name: 'Hausa',
    nativeName: 'Harshen Hausa',
    script: 'latin',
    bhashiniCode: null,
    metaCode: 'ha',
    flag: '🇳🇬',
    greeting: 'Sannu',
  },
  yo: {
    code: 'yo',
    name: 'Yoruba',
    nativeName: 'Èdè Yorùbá',
    script: 'latin',
    bhashiniCode: null,
    metaCode: 'yo',
    flag: '🇳🇬',
    greeting: 'Bawo',
  },
  am: {
    code: 'am',
    name: 'Amharic',
    nativeName: 'አማርኛ',
    script: 'ethiopic',
    bhashiniCode: null,
    metaCode: 'am',
    flag: '🇪🇹',
    greeting: 'ሰላም',
  },
  zu: {
    code: 'zu',
    name: 'Zulu',
    nativeName: 'isiZulu',
    script: 'latin',
    bhashiniCode: null,
    metaCode: 'zu',
    flag: '🇿🇦',
    greeting: 'Sawubona',
  },
};

export const DEFAULT_LOCALE = 'en';

export const LOCALE_CODES = Object.keys(SUPPORTED_LOCALES);

/**
 * Checks if code is a supported locale.
 * @param {string} code
 * @returns {boolean}
 */
export function isSupportedLocale(code) {
  if (!code || typeof code !== 'string') return false;
  const clean = code.toLowerCase().trim().split(/[-_]/)[0];
  return clean in SUPPORTED_LOCALES;
}

/**
 * Normalizes locale code to base 2-letter code if supported, or DEFAULT_LOCALE.
 * @param {string} code
 * @returns {'en'|'hi'|'te'|'ta'|'kn'|'ml'|'mr'|'bn'}
 */
export function normalizeLocale(code) {
  if (!code || typeof code !== 'string') return DEFAULT_LOCALE;
  const clean = code.toLowerCase().trim().split(/[-_]/)[0];
  return clean in SUPPORTED_LOCALES ? clean : DEFAULT_LOCALE;
}

/**
 * Get metadata for locale.
 * @param {string} code
 * @returns {object}
 */
export function getLocaleMeta(code) {
  const norm = normalizeLocale(code);
  return SUPPORTED_LOCALES[norm];
}
