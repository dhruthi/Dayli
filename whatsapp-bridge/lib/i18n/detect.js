/**
 * Dayli AI — Multilingual Script, Dialect, and Language Detector
 * Robust Unicode script matching, Devanagari Hindi vs Marathi disambiguation,
 * and Romanized transliteration (Tenglish, Hinglish, Tanglish, Kanglish, etc.)
 */

import { normalizeLocale, isSupportedLocale } from './locales.js';

// Unicode Script Ranges
const TELUGU_REGEX = /[\u0C00-\u0C7F]/;
const KANNADA_REGEX = /[\u0C80-\u0CFF]/;
const TAMIL_REGEX = /[\u0B80-\u0BFF]/;
const MALAYALAM_REGEX = /[\u0D00-\u0D7F]/;
const BENGALI_REGEX = /[\u0980-\u09FF]/;
const DEVANAGARI_REGEX = /[\u0900-\u097F]/;
const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const ETHIOPIC_REGEX = /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/;

// Marathi distinctive characters & vocabulary
const MARATHI_EXCLUSIVE_CHARS = /[\u0933]/; // ळ (LLa)
const MARATHI_MARKERS = new Set([
  'आहे', 'आहेत', 'नाही', 'काय', 'कसे', 'कसा', 'कशी', 'मला', 'तुम्हाला',
  'करा', 'होते', 'पाहिजे', 'बाळ', 'गरोदर', 'ताप', 'उष्णता', 'दवाखाना',
  'औषध', 'पाणी', 'सांगा', 'नमस्कार', 'दुखते', 'बाळाला', 'लक्षणे', 'उद्या'
]);

const HINDI_MARKERS = new Set([
  'है', 'हैं', 'नहीं', 'क्या', 'कैसे', 'कैसा', 'कैसी', 'मुझे', 'आपको',
  'करें', 'होता', 'चाहिए', 'बच्चा', 'गर्भावस्था', 'बुखार', 'गर्मी', 'अस्पताल',
  'दवा', 'पानी', 'बताओ', 'बताइए', 'नमस्ते', 'दर्द', 'शिशु', 'लक्षण', 'कल'
]);

// Romanized Indic Dialect Lexicons
const TENGLISH_WORDS = new Set([
  'ela', 'undhi', 'undi', 'unna', 'unnaru', 'enti', 'cheppandi', 'cheyandi', 'jvaram',
  'jwaram', 'kadupu', 'noppi', 'naaku', 'eroju', 'repu', 'madhyanam', 'rathri',
  'varsham', 'daggara', 'ekkada', 'ivvandi', 'pillalaki', 'babyki', 'thalli', 'thalliki',
  'aakali', 'neellu', 'palu', 'vathavaranam', 'enda', 'debba', 'ammayi', 'abbayi'
]);

const HINGLISH_WORDS = new Set([
  'kya', 'kare', 'kaise', 'kaisa', 'karein', 'hai', 'hain', 'ho', 'batao', 'bataiye',
  'bukhar', 'garmi', 'dhoop', 'paani', 'bacche', 'baccha', 'doodh', 'chahiye',
  'dast', 'dard', 'pet', 'sar', 'chot', 'aur', 'nahi', 'raha', 'rahi', 'aaj', 'kal',
  'parso', 'shishu', 'mausam', 'barish', 'dawa', 'dukan'
]);

const TANGLISH_WORDS = new Set([
  'eppadi', 'irukku', 'irukanga', 'enna', 'sollunga', 'pannunga', 'kaichal',
  'vayiru', 'vali', 'enakku', 'iniku', 'naalaiki', 'madhiyam', 'thanni',
  'vanakkam', 'kulandhai', 'maruthuvamanai', 'veiyil', 'soodu', 'marunthu',
  'kudunga', 'thalaivali', 'valikuthu', 'pappa'
]);

const KANGLISH_WORDS = new Set([
  'hege', 'ide', 'idhe', 'iddare', 'enu', 'heli', 'madi', 'jwara', 'hotte',
  'novu', 'nanage', 'ivathu', 'naale', 'madhyahna', 'neeru', 'namaskara',
  'makkalu', 'aaspathre', 'bisilu', 'oushadha', 'kodi', 'tale', 'magu'
]);

const MANGLISH_WORDS = new Set([
  'enganeyanu', 'undu', 'undallo', 'enthu', 'parayamo', 'cheyyano', 'pani',
  'vayar', 'vedhana', 'enikku', 'innu', 'naale', 'ucha', 'vellam', 'namaskaram',
  'kunjinu', 'aashupathri', 'choodu', 'marunnu', 'nalkuka', 'thala'
]);

const MARATHLISH_WORDS = new Set([
  'kasa', 'kase', 'ahe', 'ahet', 'nahi', 'kay', 'sanga', 'kara', 'tap',
  'pot', 'dukhate', 'mala', 'aaj', 'udya', 'dupari', 'pani', 'namaskar',
  'balala', 'davakhana', 'unh', 'aushadh', 'dya', 'dokyacha'
]);

const BANGLISH_WORDS = new Set([
  'kemon', 'ache', 'achen', 'na', 'ki', 'bolun', 'korbo', 'jor', 'pet',
  'batha', 'amake', 'aaj', 'kaal', 'dupure', 'jol', 'nomoshkar', 'bachar',
  'hashpatal', 'gorom', 'oushodh', 'din', 'matha'
]);

const MIN_LETTERS_TO_SWITCH_TO_EN = 4;

/**
 * Detect script and raw language from input text.
 * @param {string} text
 * @param {string} [currentLocale='en']
 * @returns {{ locale: string, rawLang: string, script: string }}
 */
export function detectLanguage(text = '', currentLocale = 'en') {
  const raw = String(text || '').normalize('NFC').trim();
  if (!raw) return { locale: currentLocale, rawLang: currentLocale, script: 'latin' };

  // 1. Script checks
  if (TELUGU_REGEX.test(raw)) {
    return { locale: 'te', rawLang: 'te', script: 'telugu' };
  }
  if (KANNADA_REGEX.test(raw)) {
    return { locale: 'kn', rawLang: 'kn', script: 'kannada' };
  }
  if (TAMIL_REGEX.test(raw)) {
    return { locale: 'ta', rawLang: 'ta', script: 'tamil' };
  }
  if (MALAYALAM_REGEX.test(raw)) {
    return { locale: 'ml', rawLang: 'ml', script: 'malayalam' };
  }
  if (BENGALI_REGEX.test(raw)) {
    return { locale: 'bn', rawLang: 'bn', script: 'bengali' };
  }
  if (DEVANAGARI_REGEX.test(raw)) {
    // Disambiguate Hindi vs Marathi
    if (MARATHI_EXCLUSIVE_CHARS.test(raw)) {
      return { locale: 'mr', rawLang: 'mr', script: 'devanagari' };
    }
    const tokens = raw.split(/[\s,?.!;:_\-+/()।॥]+/);
    let mrScore = 0;
    let hiScore = 0;
    for (const t of tokens) {
      if (MARATHI_MARKERS.has(t)) mrScore++;
      if (HINDI_MARKERS.has(t)) hiScore++;
    }
    if (mrScore > hiScore) {
      return { locale: 'mr', rawLang: 'mr', script: 'devanagari' };
    }
    if (hiScore > mrScore) {
      return { locale: 'hi', rawLang: 'hi', script: 'devanagari' };
    }
    // If tied, prefer user's current locale if it was Marathi
    const chosen = currentLocale === 'mr' ? 'mr' : 'hi';
    return { locale: chosen, rawLang: chosen, script: 'devanagari' };
  }
  if (ARABIC_REGEX.test(raw)) {
    return { locale: 'ar', rawLang: 'ar', script: 'arabic' };
  }
  if (ETHIOPIC_REGEX.test(raw)) {
    return { locale: 'am', rawLang: 'am', script: 'ethiopic' };
  }

  // 2. Latin script — check for Romanized Indic dialects
  const lower = raw.toLowerCase();
  const tokens = lower.split(/[\s,?.!;:_\-+/()]+/);

  const scores = {
    'te-Latn': 0,
    'hi-Latn': 0,
    'ta-Latn': 0,
    'kn-Latn': 0,
    'ml-Latn': 0,
    'mr-Latn': 0,
    'bn-Latn': 0,
  };

  for (const t of tokens) {
    if (TENGLISH_WORDS.has(t)) scores['te-Latn']++;
    if (HINGLISH_WORDS.has(t)) scores['hi-Latn']++;
    if (TANGLISH_WORDS.has(t)) scores['ta-Latn']++;
    if (KANGLISH_WORDS.has(t)) scores['kn-Latn']++;
    if (MANGLISH_WORDS.has(t)) scores['ml-Latn']++;
    if (MARATHLISH_WORDS.has(t)) scores['mr-Latn']++;
    if (BANGLISH_WORDS.has(t)) scores['bn-Latn']++;
  }

  let topDialect = null;
  let topCount = 0;
  for (const [dialect, count] of Object.entries(scores)) {
    if (count > topCount) {
      topCount = count;
      topDialect = dialect;
    }
  }

  if (topCount > 0 && topDialect) {
    const baseCode = topDialect.split('-')[0];
    return { locale: baseCode, rawLang: topDialect, script: 'latin' };
  }

  // Plain Latin / English
  return { locale: 'en', rawLang: 'en', script: 'latin' };
}

/**
 * Convenience detectLocale matching onboarding API.
 * @param {string} text
 * @returns {string}
 */
export function detectLocale(text) {
  return detectLanguage(text).locale;
}

/**
 * Resolves which language to answer in, taking into account current session locale
 * and short-message protection (preventing "ok", "hi" from resetting language).
 *
 * @param {string} text User's message
 * @param {string|null} currentLocale Stored session locale
 * @returns {string} Target locale code
 */
export function resolveLocale(text, currentLocale, isExplicitlySelected = false) {
  // If the user has explicitly chosen their language, lock it.
  // Never let Latin letters or medical terminology (e.g. paracetamol, ORSL) flip it to English.
  if (isExplicitlySelected && currentLocale) {
    return currentLocale;
  }

  const detected = detectLanguage(text, currentLocale || 'en');

  // If a strong non-English language was detected (native script or romanized indic), adopt it
  if (detected.locale !== 'en') {
    return detected.locale;
  }

  // If there's no current locale, default to English
  if (!currentLocale) return 'en';

  // If current locale is already English, keep it
  if (currentLocale === 'en') return 'en';

  // Current locale is non-English, but text looks like Latin / English
  // Protect against flipping on short acknowledgments like "ok", "hi", "yes"
  const latinLetters = (String(text || '').match(/[a-z]/gi) || []).length;
  return latinLetters >= MIN_LETTERS_TO_SWITCH_TO_EN ? 'en' : currentLocale;
}

/**
 * Checks if the user is asking to change or select their language.
 * @param {string} text
 * @returns {boolean}
 */
export function isLanguageCommand(text = '') {
  const t = String(text || '').trim().toLowerCase();
  if (!t) return false;
  return (
    t === 'language' ||
    t === 'lang' ||
    t === 'bhasha' ||
    t === 'bhashe' ||
    t === 'change language' ||
    t === 'select language' ||
    t === 'choose language' ||
    t === 'switch language' ||
    t === 'language change' ||
    t === 'bhasha badlo' ||
    t === 'bhasha change' ||
    /\b(?:change|switch|select|choose|set)\s+(?:the\s+)?language\b/i.test(t) ||
    /\blanguage\s+(?:change|switch|selection|menu)\b/i.test(t) ||
    t === 'భాష' ||
    t === 'భాష మార్చండి' ||
    t === 'భాష మార్చు' ||
    t === 'భాష ఎంచుకోండి' ||
    t === 'भाषा' ||
    t === 'भाषा बदलो' ||
    t === 'भाषा बदलें' ||
    t === 'भाषा चुनें' ||
    t === 'மொழி' ||
    t === 'மொழி மாற்று' ||
    t === 'மொழியை மாற்று' ||
    t === 'ಭಾಷೆ' ||
    t === 'ಭಾಷೆ ಬದಲಿಸಿ' ||
    t === 'ಭಾಷೆ ಬದಲಾಯಿಸಿ' ||
    t === 'ഭാഷ' ||
    t === 'ഭാഷ മാറ്റുക' ||
    t === 'ভাষা' ||
    t === 'ভাষা পরিবর্তন' ||
    t === 'मराठी' ||
    t === 'తెలుగు' ||
    t === 'தமிழ்' ||
    t === 'ಕನ್ನಡ' ||
    t === 'മലയാളം' ||
    t === 'বাংলা' ||
    t === 'hindi' ||
    t === 'english' ||
    t === 'العربية' ||
    t === 'عربي' ||
    t === 'تغيير اللغة' ||
    t === 'اللغة' ||
    t === 'اختر اللغة' ||
    t === 'français' ||
    t === 'francais' ||
    t === 'french' ||
    t === 'changer de langue' ||
    t === 'changer la langue' ||
    t === 'langue' ||
    t === 'kiswahili' ||
    t === 'swahili' ||
    t === 'badilisha lugha' ||
    t === 'lugha' ||
    t === 'hausa' ||
    t === 'canza harshe' ||
    t === 'harshe' ||
    t === 'yoruba' ||
    t === 'yi ede pada' ||
    t === 'ede' ||
    t === 'አማርኛ' ||
    t === 'ቋንቋ ቀይር' ||
    t === 'ቋንቋ' ||
    t === 'zulu' ||
    t === 'isizulu' ||
    t === 'shintsha ulimi' ||
    t === 'ulimi' ||
    t === 'more languages' ||
    t === 'other languages'
  );
}

/**
 * Identifies if a reply or button id selects a specific language.
 * @param {string} replyId
 * @param {string} text
 * @returns {string|null} Locale code or null
 */
export function parseLanguageSelection(replyId = '', text = '') {
  const rid = String(replyId || '').trim();
  if (rid === 'lang_more') return 'more';
  if (rid === 'lang_back') return 'back';
  if (rid.startsWith('lang_')) {
    const code = rid.replace('lang_', '');
    if (isSupportedLocale(code)) return code;
  }

  const t = String(text || '').trim().toLowerCase();
  if (!t) return null;

  if (t === 'more' || t === 'more languages' || t === 'other languages' || t === 'المزيد' || t === 'plus') {
    return 'more';
  }
  if (t === 'back' || t === 'main menu' || t === 'رجوع' || t === 'retour') {
    return 'back';
  }

  // Numeric selection: 1 to 15 (supports "1", "15", "option 1", Indic numerals, Arabic numerals, Ethiopic numerals)
  const numMatch = t.match(/^(?:option\s+|choice\s+)?([1-9]|1[0-5]|[१-९]|१[०-५]|[౧-౯]|౧[०-౫]|[\u0661-\u0669]|\u0661[\u0660-\u0665]|[፩-፱]|፲[፩-፭]?)(?:\.|\b|\s|$)/i);
  if (numMatch) {
    const rawDigit = numMatch[1];
    const digitMap = {
      '1': 'en', '१': 'en', '౧': 'en', '௧': 'en', '೧': 'en', '൧': 'en', '১': 'en', '١': 'en', '፩': 'en',
      '2': 'hi', '२': 'hi', '౨': 'hi', '௨': 'hi', '೨': 'hi', '൨': 'hi', '২': 'hi', '٢': 'hi', '፪': 'hi',
      '3': 'te', '३': 'te', '౩': 'te', '௩': 'te', '೩': 'te', '൩': 'te', '৩': 'te', '٣': 'te', '፫': 'te',
      '4': 'ta', '४': 'ta', '౪': 'ta', '௪': 'ta', '೪': 'ta', '൪': 'ta', '৪': 'ta', '٤': 'ta', '፬': 'ta',
      '5': 'kn', '५': 'kn', '౫': 'kn', '௫': 'kn', '೫': 'kn', '൫': 'kn', '৫': 'kn', '٥': 'kn', '፭': 'kn',
      '6': 'ml', '६': 'ml', '౬': 'ml', '௬': 'ml', '೬': 'ml', '൬': 'ml', '৬': 'ml', '٦': 'ml', '፮': 'ml',
      '7': 'mr', '७': 'mr', '౭': 'mr', '௭': 'mr', '೭': 'mr', '൭': 'mr', '৭': 'mr', '٧': 'mr', '፯': 'mr',
      '8': 'bn', '८': 'bn', '౮': 'bn', '௮': 'bn', '೮': 'bn', '൮': 'bn', '৮': 'bn', '٨': 'bn', '፰': 'bn',
      '9': 'ar', '९': 'ar', '౯': 'ar', '௯': 'ar', '೯': 'ar', '൯': 'ar', '৯': 'ar', '٩': 'ar', '፱': 'ar',
      '10': 'fr', '१०': 'fr', '౧౦': 'fr', '١٠': 'fr', '፲': 'fr',
      '11': 'sw', '११': 'sw', '౧౧': 'sw', '١١': 'sw', '፲፩': 'sw',
      '12': 'ha', '१२': 'ha', '౧౨': 'ha', '١٢': 'ha', '፲፪': 'ha',
      '13': 'yo', '१३': 'yo', '౧౩': 'yo', '١٣': 'yo', '፲፫': 'yo',
      '14': 'am', '१४': 'am', '౧౪': 'am', '١٤': 'am', '፲፬': 'am',
      '15': 'zu', '१५': 'zu', '౧౫': 'zu', '١٥': 'zu', '፲፭': 'zu',
    };
    if (digitMap[rawDigit]) return digitMap[rawDigit];
  }

  // Never treat common English greetings/words like "hi", "hey", "hello" as a language code
  if (/^(?:hi|hey|hello|hola|namaste|vanakkam)\b/i.test(t)) {
    if (!/\b(?:language|change|switch|talk|speak|convert)\b/i.test(t)) {
      return null;
    }
  }

  // English
  if (
    t === 'english' ||
    /\b(?:change|switch|set|talk|speak|convert|choose|select)?(?:\s+(?:the|my)?\s*language)?\s+(?:to|in)?\s*english\b/i.test(t) ||
    t === 'lang:en'
  ) {
    return 'en';
  }

  // Hindi (NEVER match bare "hi")
  if (
    t === 'hindi' ||
    t === 'हिन्दी' ||
    t === 'हिंदी' ||
    /\b(?:change|switch|set|talk|speak|convert|choose|select)?(?:\s+(?:the|my)?\s*language)?\s+(?:to|in)?\s*(?:hindi|हिन्दी|हिंदी)\b/i.test(t) ||
    t === 'lang:hi'
  ) {
    return 'hi';
  }

  // Telugu
  if (
    t === 'telugu' ||
    t === 'తెలుగు' ||
    /\b(?:change|switch|set|talk|speak|convert|choose|select)?(?:\s+(?:the|my)?\s*language)?\s+(?:to|in)?\s*(?:telugu|తెలుగు)\b/i.test(t) ||
    t === 'lang:te'
  ) {
    return 'te';
  }

  // Tamil
  if (
    t === 'tamil' ||
    t === 'தமிழ்' ||
    /\b(?:change|switch|set|talk|speak|convert|choose|select)?(?:\s+(?:the|my)?\s*language)?\s+(?:to|in)?\s*(?:tamil|தமிழ்)\b/i.test(t) ||
    t === 'lang:ta'
  ) {
    return 'ta';
  }

  // Kannada
  if (
    t === 'kannada' ||
    t === 'ಕನ್ನಡ' ||
    /\b(?:change|switch|set|talk|speak|convert|choose|select)?(?:\s+(?:the|my)?\s*language)?\s+(?:to|in)?\s*(?:kannada|ಕನ್ನಡ)\b/i.test(t) ||
    t === 'lang:kn'
  ) {
    return 'kn';
  }

  // Malayalam
  if (
    t === 'malayalam' ||
    t === 'മലയാളം' ||
    /\b(?:change|switch|set|talk|speak|convert|choose|select)?(?:\s+(?:the|my)?\s*language)?\s+(?:to|in)?\s*(?:malayalam|മലയാളം)\b/i.test(t) ||
    t === 'lang:ml'
  ) {
    return 'ml';
  }

  // Marathi
  if (
    t === 'marathi' ||
    t === 'मराठी' ||
    /\b(?:change|switch|set|talk|speak|convert|choose|select)?(?:\s+(?:the|my)?\s*language)?\s+(?:to|in)?\s*(?:marathi|मराठी)\b/i.test(t) ||
    t === 'lang:mr'
  ) {
    return 'mr';
  }

  // Bengali
  if (
    t === 'bengali' ||
    t === 'bangla' ||
    t === 'বাংলা' ||
    /\b(?:change|switch|set|talk|speak|convert|choose|select)?(?:\s+(?:the|my)?\s*language)?\s+(?:to|in)?\s*(?:bengali|bangla|বাংলা)\b/i.test(t) ||
    t === 'lang:bn'
  ) {
    return 'bn';
  }

  // Arabic
  if (
    t === 'arabic' ||
    t === 'العربية' ||
    t === 'عربي' ||
    /\b(?:change|switch|set|talk|speak|convert|choose|select)?(?:\s+(?:the|my)?\s*language)?\s+(?:to|in)?\s*(?:arabic|العربية|عربي)\b/i.test(t) ||
    t === 'lang:ar'
  ) {
    return 'ar';
  }

  // French
  if (
    t === 'french' ||
    t === 'français' ||
    t === 'francais' ||
    /\b(?:change|switch|set|talk|speak|convert|choose|select)?(?:\s+(?:the|my)?\s*language)?\s+(?:to|in)?\s*(?:french|français|francais)\b/i.test(t) ||
    t === 'lang:fr'
  ) {
    return 'fr';
  }

  // Swahili
  if (
    t === 'swahili' ||
    t === 'kiswahili' ||
    /\b(?:change|switch|set|talk|speak|convert|choose|select)?(?:\s+(?:the|my)?\s*language)?\s+(?:to|in)?\s*(?:swahili|kiswahili)\b/i.test(t) ||
    t === 'lang:sw'
  ) {
    return 'sw';
  }

  // Hausa
  if (
    t === 'hausa' ||
    t === 'harshen hausa' ||
    /\b(?:change|switch|set|talk|speak|convert|choose|select)?(?:\s+(?:the|my)?\s*language)?\s+(?:to|in)?\s*(?:hausa|harshen hausa)\b/i.test(t) ||
    t === 'lang:ha'
  ) {
    return 'ha';
  }

  // Yoruba
  if (
    t === 'yoruba' ||
    t === 'yorùbá' ||
    /\b(?:change|switch|set|talk|speak|convert|choose|select)?(?:\s+(?:the|my)?\s*language)?\s+(?:to|in)?\s*(?:yoruba|yorùbá)\b/i.test(t) ||
    t === 'lang:yo'
  ) {
    return 'yo';
  }

  // Amharic
  if (
    t === 'amharic' ||
    t === 'አማርኛ' ||
    /\b(?:change|switch|set|talk|speak|convert|choose|select)?(?:\s+(?:the|my)?\s*language)?\s+(?:to|in)?\s*(?:amharic|አማርኛ)\b/i.test(t) ||
    t === 'lang:am'
  ) {
    return 'am';
  }

  // Zulu
  if (
    t === 'zulu' ||
    t === 'isizulu' ||
    /\b(?:change|switch|set|talk|speak|convert|choose|select)?(?:\s+(?:the|my)?\s*language)?\s+(?:to|in)?\s*(?:zulu|isizulu)\b/i.test(t) ||
    t === 'lang:zu'
  ) {
    return 'zu';
  }

  return null;
}
