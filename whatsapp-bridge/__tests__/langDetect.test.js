import { describe, it, expect } from 'vitest';
import {
  detectLanguage,
  detectLocale,
  resolveLocale,
  isLanguageCommand,
  parseLanguageSelection,
} from '../lib/i18n/index.js';

describe('Multilingual Script & Language Detection', () => {
  describe('Native Script Detection', () => {
    it('detects Telugu script', () => {
      const res = detectLanguage('ఈరోజు హైదరాబాద్‌లో ఎండ ఎలా ఉంది?');
      expect(res.locale).toBe('te');
      expect(res.script).toBe('telugu');
    });

    it('detects Kannada script', () => {
      const res = detectLanguage('ಇಂದು ಬೆಂಗಳೂರಿನಲ್ಲಿ ತಾಪಮಾನ ಎಷ್ಟಿದೆ?');
      expect(res.locale).toBe('kn');
      expect(res.script).toBe('kannada');
    });

    it('detects Tamil script', () => {
      const res = detectLanguage('சென்னையில் இன்று மழை வருமா?');
      expect(res.locale).toBe('ta');
      expect(res.script).toBe('tamil');
    });

    it('detects Malayalam script', () => {
      const res = detectLanguage('ഇന്ന് കൊച്ചിയിൽ നല്ല ചൂടാണോ?');
      expect(res.locale).toBe('ml');
      expect(res.script).toBe('malayalam');
    });

    it('detects Bengali script', () => {
      const res = detectLanguage('আজকে কলকাতায় তাপমাত্রা কত?');
      expect(res.locale).toBe('bn');
      expect(res.script).toBe('bengali');
    });

    it('disambiguates Devanagari Hindi vs Marathi', () => {
      // Hindi marker words
      const hindiRes = detectLanguage('आज बहुत तेज गर्मी है और बच्चा रो रहा है');
      expect(hindiRes.locale).toBe('hi');
      expect(hindiRes.script).toBe('devanagari');

      // Marathi exclusive letter ळ
      const marathiCharRes = detectLanguage('माझ्या बाळाला ताप आला आहे');
      expect(marathiCharRes.locale).toBe('mr');
      expect(marathiCharRes.script).toBe('devanagari');

      // Marathi marker words
      const marathiRes = detectLanguage('उद्या दवाखान्यात जायचे आहे का?');
      expect(marathiRes.locale).toBe('mr');
      expect(marathiRes.script).toBe('devanagari');
    });
  });

  describe('Romanized (Code-Mixed) Indic Dialect Detection', () => {
    it('detects Tenglish (Romanized Telugu) and maps to te', () => {
      const res = detectLanguage('eroju hyderabad lo temperature entha undhi?');
      expect(res.locale).toBe('te');
      expect(res.rawLang).toBe('te-Latn');
      expect(res.script).toBe('latin');
    });

    it('detects Hinglish (Romanized Hindi) and maps to hi', () => {
      const res = detectLanguage('aaj bohot garmi hai bacche ko bukhar hai');
      expect(res.locale).toBe('hi');
      expect(res.rawLang).toBe('hi-Latn');
    });

    it('detects Tanglish (Romanized Tamil) and maps to ta', () => {
      const res = detectLanguage('iniku eppadi irukku veiyil kulandhai ku');
      expect(res.locale).toBe('ta');
      expect(res.rawLang).toBe('ta-Latn');
    });

    it('detects Kanglish (Romanized Kannada) and maps to kn', () => {
      const res = detectLanguage('ivathu bisilu hege ide makkalu safe a?');
      expect(res.locale).toBe('kn');
      expect(res.rawLang).toBe('kn-Latn');
    });

    it('detects Manglish (Romanized Malayalam) and maps to ml', () => {
      const res = detectLanguage('innu choodu enganeyanu kunjinu vellam');
      expect(res.locale).toBe('ml');
      expect(res.rawLang).toBe('ml-Latn');
    });

    it('detects Marathlish (Romanized Marathi) and maps to mr', () => {
      const res = detectLanguage('aaj dupari tap ahe balala davakhana');
      expect(res.locale).toBe('mr');
      expect(res.rawLang).toBe('mr-Latn');
    });

    it('detects Banglish (Romanized Bengali) and maps to bn', () => {
      const res = detectLanguage('aaj gorom kemon ache bachar jor');
      expect(res.locale).toBe('bn');
      expect(res.rawLang).toBe('bn-Latn');
    });
  });

  describe('resolveLocale Protection & Language Switching', () => {
    it('switches to native script language immediately on script arrival', () => {
      expect(resolveLocale('వడదెబ్బ జాగ్రత్తలు', 'en')).toBe('te');
      expect(resolveLocale('வணக்கம் மருந்து', 'en')).toBe('ta');
      expect(resolveLocale('ನಮಸ್ಕಾರ ಆಸ್ಪತ್ರೆ', 'en')).toBe('kn');
      expect(resolveLocale('নমস্কার খবর', 'en')).toBe('bn');
    });

    it('protects non-English users from short acknowledgments ("ok", "hi", "yes")', () => {
      expect(resolveLocale('ok', 'te')).toBe('te');
      expect(resolveLocale('hi', 'ta')).toBe('ta');
      expect(resolveLocale('yes', 'kn')).toBe('kn');
      expect(resolveLocale('no', 'bn')).toBe('bn');
    });

    it('switches to English when substantial English sentences are typed and not explicitly locked', () => {
      expect(resolveLocale('Can you please tell me the weather forecast for today?', 'te', false)).toBe('en');
    });

    it('locks language strictly when isExplicitlySelected is true, ignoring English medical terms', () => {
      expect(resolveLocale('paracetamol 500mg syrup fever', 'te', true)).toBe('te');
      expect(resolveLocale('Can you please tell me the weather forecast for today?', 'te', true)).toBe('te');
      expect(resolveLocale('ORSL hydration for my baby', 'hi', true)).toBe('hi');
      expect(resolveLocale('fever and cough since yesterday', 'kn', true)).toBe('kn');
    });
  });

  describe('Language Command & Menu Selection', () => {
    it('identifies language commands in multiple languages', () => {
      expect(isLanguageCommand('language')).toBe(true);
      expect(isLanguageCommand('LANGUAGE')).toBe(true);
      expect(isLanguageCommand('change language')).toBe(true);
      expect(isLanguageCommand('switch language')).toBe(true);
      expect(isLanguageCommand('language change')).toBe(true);
      expect(isLanguageCommand('bhasha badlo')).toBe(true);
      expect(isLanguageCommand('భాష మార్చండి')).toBe(true);
      expect(isLanguageCommand('भाषा बदलो')).toBe(true);
      expect(isLanguageCommand('تغيير اللغة')).toBe(true);
      expect(isLanguageCommand('changer de langue')).toBe(true);
      expect(isLanguageCommand('badilisha lugha')).toBe(true);
      expect(isLanguageCommand('canza harshe')).toBe(true);
      expect(isLanguageCommand('yi ede pada')).toBe(true);
      expect(isLanguageCommand('ቋንቋ ቀይር')).toBe(true);
      expect(isLanguageCommand('shintsha ulimi')).toBe(true);
      expect(isLanguageCommand('lang')).toBe(true);
      expect(isLanguageCommand('bhasha')).toBe(true);
      expect(isLanguageCommand('భాష')).toBe(true);
      expect(isLanguageCommand('भाषा')).toBe(true);
      expect(isLanguageCommand('மொழி')).toBe(true);
      expect(isLanguageCommand('ಭಾಷೆ')).toBe(true);
      expect(isLanguageCommand('العربية')).toBe(true);
      expect(isLanguageCommand('français')).toBe(true);
      expect(isLanguageCommand('kiswahili')).toBe(true);
      expect(isLanguageCommand('weather in hyderabad')).toBe(false);
    });

    it('parses numeric selections 1 to 15, Indic digits, and Arabic digits', () => {
      expect(parseLanguageSelection('', '1')).toBe('en');
      expect(parseLanguageSelection('', '2')).toBe('hi');
      expect(parseLanguageSelection('', '3')).toBe('te');
      expect(parseLanguageSelection('', '4')).toBe('ta');
      expect(parseLanguageSelection('', '5')).toBe('kn');
      expect(parseLanguageSelection('', '6')).toBe('ml');
      expect(parseLanguageSelection('', '7')).toBe('mr');
      expect(parseLanguageSelection('', '8')).toBe('bn');
      expect(parseLanguageSelection('', '9')).toBe('ar');
      expect(parseLanguageSelection('', '10')).toBe('fr');
      expect(parseLanguageSelection('', '11')).toBe('sw');
      expect(parseLanguageSelection('', '12')).toBe('ha');
      expect(parseLanguageSelection('', '13')).toBe('yo');
      expect(parseLanguageSelection('', '14')).toBe('am');
      expect(parseLanguageSelection('', '15')).toBe('zu');
      expect(parseLanguageSelection('', '3.')).toBe('te');
      expect(parseLanguageSelection('', 'option 9')).toBe('ar');
      expect(parseLanguageSelection('', 'option 10')).toBe('fr');
      expect(parseLanguageSelection('', '౩')).toBe('te');
      expect(parseLanguageSelection('', '२')).toBe('hi');
      expect(parseLanguageSelection('', '٩')).toBe('ar');
      expect(parseLanguageSelection('', '١٠')).toBe('fr');
      expect(parseLanguageSelection('', '١١')).toBe('sw');
    });

    it('parses interactive menu button/list selections for all global languages', () => {
      expect(parseLanguageSelection('lang_ta')).toBe('ta');
      expect(parseLanguageSelection('lang_kn')).toBe('kn');
      expect(parseLanguageSelection('lang_mr')).toBe('mr');
      expect(parseLanguageSelection('lang_bn')).toBe('bn');
      expect(parseLanguageSelection('lang_ar')).toBe('ar');
      expect(parseLanguageSelection('lang_fr')).toBe('fr');
      expect(parseLanguageSelection('lang_sw')).toBe('sw');
      expect(parseLanguageSelection('lang_ha')).toBe('ha');
      expect(parseLanguageSelection('lang_yo')).toBe('yo');
      expect(parseLanguageSelection('lang_am')).toBe('am');
      expect(parseLanguageSelection('lang_zu')).toBe('zu');
      expect(parseLanguageSelection('lang_more')).toBe('more');
      expect(parseLanguageSelection('lang_back')).toBe('back');
      expect(parseLanguageSelection('', 'తెలుగు')).toBe('te');
      expect(parseLanguageSelection('', 'தமிழ்')).toBe('ta');
      expect(parseLanguageSelection('', 'English')).toBe('en');
      expect(parseLanguageSelection('', 'العربية')).toBe('ar');
      expect(parseLanguageSelection('', 'arabic')).toBe('ar');
      expect(parseLanguageSelection('', 'français')).toBe('fr');
      expect(parseLanguageSelection('', 'french')).toBe('fr');
      expect(parseLanguageSelection('', 'kiswahili')).toBe('sw');
      expect(parseLanguageSelection('', 'swahili')).toBe('sw');
      expect(parseLanguageSelection('', 'hausa')).toBe('ha');
      expect(parseLanguageSelection('', 'yoruba')).toBe('yo');
      expect(parseLanguageSelection('', 'አማርኛ')).toBe('am');
      expect(parseLanguageSelection('', 'zulu')).toBe('zu');
      expect(parseLanguageSelection('', 'change the language to english')).toBe('en');
      expect(parseLanguageSelection('', 'switch to hindi')).toBe('hi');
      expect(parseLanguageSelection('', 'Hi')).toBeNull();
      expect(parseLanguageSelection('', 'hi')).toBeNull();
      expect(parseLanguageSelection('', 'hello')).toBeNull();
      expect(parseLanguageSelection('', 'something else')).toBeNull();
      // Phrased requests
      expect(parseLanguageSelection('', 'Tamil only')).toBe('ta');
      expect(parseLanguageSelection('', 'tamil only')).toBe('ta');
      expect(parseLanguageSelection('', 'TAMIL ONLY')).toBe('ta');
      expect(parseLanguageSelection('', 'only tamil')).toBe('ta');
      expect(parseLanguageSelection('', 'in tamil')).toBe('ta');
      expect(parseLanguageSelection('', 'tamil please')).toBe('ta');
      expect(parseLanguageSelection('', 'French only')).toBe('fr');
      expect(parseLanguageSelection('', 'English please')).toBe('en');
      // Interactive non-language button reply IDs must NEVER switch language
      expect(parseLanguageSelection('ob_preg_20', '2வது காலாண்டு (13–27 வார')).toBeNull();
      expect(parseLanguageSelection('ob_subj_pregnant', 'நான் கர்ப்பமாக உள்ளேன்')).toBeNull();
      expect(parseLanguageSelection('ob_consent_yes', 'Yes')).toBeNull();
      // Partial numerical text must NEVER match numeric language selection
      expect(parseLanguageSelection('', '2வது காலாண்டு (13–27 வார')).toBeNull();
      expect(parseLanguageSelection('', '2 days fever')).toBeNull();
      expect(parseLanguageSelection('', '3 months baby')).toBeNull();
      // Bare numbers only match when allowNumeric is true
      expect(parseLanguageSelection('', '2', { allowNumeric: false })).toBeNull();
      expect(parseLanguageSelection('', '2', { allowNumeric: true })).toBe('hi');
    });
  });
});
