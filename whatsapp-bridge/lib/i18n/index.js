/**
 * Dayli AI — Multilingual i18n Translation & Prompt Delivery Engine
 * Sub-millisecond in-process lookup with fallback chain and string interpolation.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_LOCALE, normalizeLocale, isSupportedLocale, SUPPORTED_LOCALES } from './locales.js';
import { detectLanguage, detectLocale, resolveLocale, isLanguageCommand, parseLanguageSelection } from './detect.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CATALOG_DIR = path.resolve(__dirname, 'catalog');

const catalogs = {};

// Load all catalogs at module initialization
for (const code of Object.keys(SUPPORTED_LOCALES)) {
  const filePath = path.join(CATALOG_DIR, `${code}.json`);
  if (fs.existsSync(filePath)) {
    try {
      catalogs[code] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
      console.error(`[i18n] Failed to load catalog for ${code}:`, err.message);
      catalogs[code] = {};
    }
  } else {
    catalogs[code] = {};
  }
}

/**
 * Translates a key for a given locale, interpolating {variables}.
 * Falls back to default locale (English) if key is missing in target locale.
 *
 * @param {string} key Catalog string identifier
 * @param {string} [locale='en'] User's locale
 * @param {Record<string, string|number>} [vars={}] Variables for interpolation
 * @returns {string} Translated and formatted string
 */
export function t(key, locale = DEFAULT_LOCALE, vars = {}) {
  const norm = normalizeLocale(locale);
  let template = catalogs[norm]?.[key];

  if (!template && norm !== DEFAULT_LOCALE) {
    template = catalogs[DEFAULT_LOCALE]?.[key];
  }

  if (!template) {
    return key;
  }

  if (typeof template !== 'string') {
    return template;
  }

  // Interpolate {varName}
  return template.replace(/\{(\w+)\}/g, (match, p1) => {
    return vars[p1] !== undefined ? String(vars[p1]) : match;
  });
}

/**
 * Builds an interactive WhatsApp list message for choosing/changing language.
 * Adheres strictly to Meta Graph API 24-character title and 10-row limits.
 *
 * @param {string} [currentLocale='en']
 * @returns {object} WhatsApp interactive list payload
 */
export function getLanguageMenu(currentLocale = DEFAULT_LOCALE) {
  const loc = normalizeLocale(currentLocale);

  const rows = [
    { id: 'lang_en', title: 'English', description: 'English' },
    { id: 'lang_hi', title: 'हिन्दी (Hindi)', description: 'उत्तर व मध्य भारत' },
    { id: 'lang_te', title: 'తెలుగు (Telugu)', description: 'తెలంగాణ & ఆంధ్రప్రదేశ్' },
    { id: 'lang_ta', title: 'தமிழ் (Tamil)', description: 'தமிழ்நாடு' },
    { id: 'lang_kn', title: 'ಕನ್ನಡ (Kannada)', description: 'ಕರ್ನಾಟಕ' },
    { id: 'lang_ml', title: 'മലയാളം (Malayalam)', description: 'കേരളം' },
    { id: 'lang_mr', title: 'मराठी (Marathi)', description: 'महाराष्ट्र' },
    { id: 'lang_bn', title: 'বাংলা (Bengali)', description: 'পশ্চিমবঙ্গ' },
  ];

  return {
    kind: 'list',
    header: t('lang_menu_header', loc),
    body: t('lang_menu_body', loc),
    buttonText: t('lang_menu_btn', loc),
    sections: [
      {
        title: t('lang_menu_section', loc),
        rows,
      },
    ],
  };
}

/**
 * Returns warm confirmation message in newly switched language.
 * @param {string} newLocale
 * @returns {string}
 */
export function getLanguageSwitchedMessage(newLocale) {
  const loc = normalizeLocale(newLocale);
  return t('lang_switched_confirm', loc);
}

export {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  normalizeLocale,
  isSupportedLocale,
  detectLanguage,
  detectLocale,
  resolveLocale,
  isLanguageCommand,
  parseLanguageSelection,
};
