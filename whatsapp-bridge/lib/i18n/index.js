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
 * @param {'main'|'more'} [page='main'] Menu page
 * @returns {object} WhatsApp interactive list payload
 */
export function getLanguageMenu(currentLocale = DEFAULT_LOCALE, page = 'main') {
  const loc = normalizeLocale(currentLocale);

  if (page === 'more') {
    const rows = [
      { id: 'lang_kn', title: '5. ಕನ್ನಡ (Kannada)', description: 'Karnataka' },
      { id: 'lang_ml', title: '6. മലയാളം (Malayalam)', description: 'Kerala' },
      { id: 'lang_mr', title: '7. मराठी (Marathi)', description: 'Maharashtra' },
      { id: 'lang_yo', title: '13. Èdè Yorùbá', description: 'Nigeria / West Africa' },
      { id: 'lang_am', title: '14. አማርኛ (Amharic)', description: 'Ethiopia' },
      { id: 'lang_zu', title: '15. isiZulu (Zulu)', description: 'South Africa' },
      { id: 'lang_back', title: '⬅️ Back to Main', description: 'Show main languages' },
    ];
    return {
      kind: 'list',
      header: '🌐 More Languages',
      body:
        'Select your language / Choisir la langue / اختر لغتك / Chagua lugha:\n\n' +
        '5. ಕನ್ನಡ (Kannada)\n' +
        '6. മലയാളം (Malayalam)\n' +
        '7. मराठी (Marathi)\n' +
        '13. Èdè Yorùbá (Yoruba)\n' +
        '14. አማርኛ (Amharic)\n' +
        '15. isiZulu (Zulu)\n\n' +
        'Reply with number (1-15) or tap your choice.',
      buttonText: 'Select Language',
      sections: [{ title: 'Languages', rows }],
    };
  }

  const rows = [
    { id: 'lang_en', title: '1. English', description: 'Global English' },
    { id: 'lang_hi', title: '2. हिन्दी (Hindi)', description: 'North & Central India' },
    { id: 'lang_te', title: '3. తెలుగు (Telugu)', description: 'Telangana & Andhra' },
    { id: 'lang_ta', title: '4. தமிழ் (Tamil)', description: 'Tamil Nadu' },
    { id: 'lang_bn', title: '8. বাংলা (Bengali)', description: 'West Bengal & Bangladesh' },
    { id: 'lang_ar', title: '9. العربية (Arabic)', description: 'North Africa & Middle East' },
    { id: 'lang_fr', title: '10. Français (French)', description: 'West & Central Africa' },
    { id: 'lang_sw', title: '11. Kiswahili (Swahili)', description: 'East & Central Africa' },
    { id: 'lang_ha', title: '12. Harshen Hausa', description: 'Nigeria & West Africa' },
    { id: 'lang_more', title: '🌐 More Languages...', description: 'Kannada, Marathi, Yoruba...' },
  ];

  return {
    kind: 'list',
    header: t('lang_menu_header', loc),
    body:
      '🌸 Welcome to Dayli AI | مرحباً بك | Bienvenue | Karibu\n\n' +
      'Please select your language / اختر لغتك / Choisissez votre langue / Chagua lugha:\n\n' +
      '1. English          8. বাংলা (Bengali)\n' +
      '2. हिन्दी (Hindi)     9. العربية (Arabic)\n' +
      '3. తెలుగు (Telugu)    10. Français (French)\n' +
      '4. தமிழ் (Tamil)     11. Kiswahili (Swahili)\n' +
      '5. ಕನ್ನಡ (Kannada)   12. Harshen Hausa (Hausa)\n' +
      '6. മലയാളം (Malayalam) 13. Èdè Yorùbá (Yoruba)\n' +
      '7. मराठी (Marathi)   14. አማርኛ (Amharic)\n' +
      '                    15. isiZulu (Zulu)\n\n' +
      'Reply with 1-15 or choose from the menu below.',
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
