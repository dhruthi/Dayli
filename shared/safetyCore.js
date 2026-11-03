/**
 * Dayli deterministic clinical safety core.
 * =========================================
 *
 * Single source of truth for every safety-critical decision. Plain ESM, and
 * deliberately independent of transport, so the rules can be tested on their
 * own and reused by any caller without duplicating safety-critical logic.
 *
 * Design rules this file exists to enforce:
 *
 *  1. THE MODEL IS NEVER THE AUTHORITY. Red flags, escalation, referral and
 *     medication boundaries are decided here, in code. The model may phrase the
 *     answer; it may not change the decision.
 *
 *  2. SAFETY IS LANGUAGE-INDEPENDENT. Rules evaluate structured signals, not
 *     English prose. A multilingual red-flag lexicon (en / hi / te) provides a
 *     conservative floor so a Telugu message cannot bypass a rule that an
 *     English message would trigger. Audited behaviour showed exactly that
 *     failure when safety lived only in the system prompt.
 *
 *  3. SUBJECT TYPE SELECTS THE RULES. An infant is not a small adult. Adult
 *     obstetric positioning, adult fluid volumes and adult drug doses must
 *     never reach a pediatric path.
 *
 *  4. MATCHING IS ANCHORED. Substring matching turns "flat 104" into a fever
 *     emergency and "warm weather" into limb-pain triage. Every matcher here is
 *     bounded.
 *
 *  5. NOTHING IS FABRICATED. This module never invents a facility, a clinician,
 *     a temperature or a dose.
 *
 * @typedef {'adult'|'pregnant_person'|'postpartum_person'|'infant'|'child'|'unknown'} SubjectType
 * @typedef {'low'|'moderate'|'high'|'emergency'} RiskLevel
 */

export const SAFETY_RULE_VERSION = '2.0.0';

/** @type {SubjectType[]} */
export const SUBJECT_TYPES = ['adult', 'pregnant_person', 'postpartum_person', 'infant', 'child', 'unknown'];

export const PEDIATRIC_SUBJECTS = ['infant', 'child'];

// ───────────────────────────────────────────────────────────────────────────
// Matching primitives
// ───────────────────────────────────────────────────────────────────────────

/**
 * Latin word-boundary match. `\b` does not work for Devanagari or Telugu, so
 * non-Latin phrases fall through to a normalized substring test — acceptable
 * because those entries are whole clinical phrases, not fragments like "arm".
 */
function matchesPhrase(haystack, phrase) {
  if (!phrase) return false;
  if (/^[\x20-\x7E]+$/.test(phrase)) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(haystack);
  }
  return haystack.includes(phrase);
}

function matchesAny(text, phrases) {
  const haystack = ` ${String(text || '').toLowerCase().replace(/\s+/g, ' ')} `;
  return phrases.some((p) => matchesPhrase(haystack, p));
}

/**
 * Temperature stated with a unit. Deliberately requires the unit or the word
 * "fever"/equivalent nearby — a bare "104" is a house number far more often
 * than it is a temperature.
 */
export function extractStatedTemperatureC(text) {
  const t = String(text || '').toLowerCase();
  let best = null;
  const celsius = /(\d{2}(?:\.\d)?)\s*(?:°\s*c|deg(?:rees)?\s*c|celsius|c\b)/g;
  const fahrenheit = /(\d{2,3}(?:\.\d)?)\s*(?:°\s*f|deg(?:rees)?\s*f|fahrenheit|f\b)/g;
  let m;
  while ((m = celsius.exec(t))) {
    const v = parseFloat(m[1]);
    if (v >= 30 && v <= 45) best = Math.max(best ?? -Infinity, v);
  }
  while ((m = fahrenheit.exec(t))) {
    const v = parseFloat(m[1]);
    if (v >= 90 && v <= 113) {
      const c = (v - 32) / 1.8;
      best = Math.max(best ?? -Infinity, Math.round(c * 10) / 10);
    }
  }
  // "39 degrees" / "39 degree fever" with no unit letter — assume Celsius in a
  // clinical context only when a fever word is present.
  if (best === null && /(fever|बुखार|జ్వరం|temperature)/.test(t)) {
    const bare = /(\d{2}(?:\.\d)?)\s*(?:degree|degrees|डिग्री|డిగ్రీ)/.exec(t);
    if (bare) {
      const v = parseFloat(bare[1]);
      if (v >= 35 && v <= 45) best = v;
    }
  }
  return best;
}

/** Age in months, if the message states one. */
export function extractAgeMonths(text) {
  const t = String(text || '').toLowerCase();
  const mo = /(\d{1,2})\s*(?:month|months|mo\b|महीने|महीना|నెలల|నెల)/.exec(t);
  if (mo) return parseInt(mo[1], 10);
  const yr = /(\d{1,2})\s*(?:year|years|yr\b|साल|वर्ष|సంవత్సర|ఏళ్ల)/.exec(t);
  if (yr) return parseInt(yr[1], 10) * 12;
  const wk = /(\d{1,2})\s*(?:week|weeks|हफ्ते|వారాల)/.exec(t);
  if (wk) return Math.floor(parseInt(wk[1], 10) / 4.345);
  if (matchesAny(t, ['newborn', 'new born', 'नवजात', 'నవజాత'])) return 0;
  return null;
}

// ───────────────────────────────────────────────────────────────────────────
// Multilingual clinical lexicon
//
// Conservative floor only. English, Hindi and Telugu terms for the highest-
// severity presentations, so a rule cannot be bypassed by writing in Telugu.
// Not a translation layer — a safety net.
// ───────────────────────────────────────────────────────────────────────────

const LEX = {
  infantSubject: [
    'baby', 'infant', 'newborn', 'new born', 'my son', 'my daughter', 'bub',
    'बच्चे', 'बच्चा', 'शिशु', 'नवजात', 'बेटा', 'बेटी',
    'బిడ్డ', 'బిడ్డకు', 'శిశువు', 'పాప', 'బాబు', 'నవజాత',
    'குழந்தை', 'சிசு', 'பாப்பா', 'மகன்', 'மகள்',
    'ಮಗು', 'ಶಿಶು', 'ಕಂದ', 'ಮಗ', 'ಮಗಳು',
    'കുഞ്ഞ്', 'കുട്ടി', 'ശിശു', 'മകൻ', 'മകൾ',
    'बाळ', 'शिशू', 'मुलगा', 'मुलगी',
    'বাচ্চা', 'শিশু', 'ছেলে', 'মেয়ে',
  ],
  childSubject: [
    'toddler', 'child', 'kid', 'बच्चे', 'बालक', 'పిల్ల', 'పిల్లవాడు', 'చిన్నారి',
    'சிறுவன்', 'சிறுமி', 'ಹಿರಿಯ ಮಗು', 'കുട്ടി', 'मूल', 'সন্তান',
  ],
  pregnantSubject: [
    'pregnant', 'pregnancy', 'trimester', 'expecting', 'weeks pregnant', 'months pregnant',
    'गर्भवती', 'गर्भावस्था', 'प्रेग्नेंट', 'గర్భవతి', 'గర్భిణి', 'గర్భం',
    'கர்ப்பம்', 'கர்ப்பிணி', 'ಗರ್ಭಿಣಿ', 'ಗರ್ಭಾವಸ್ಥೆ',
    'ഗർഭിണി', 'ഗർഭം', 'गरोदर', 'गर्भवती', 'গর্ভবতী', 'গর্ভাবস্থা',
  ],
  postpartumSubject: [
    'postpartum', 'post partum', 'after delivery', 'after birth', 'breastfeeding', 'nursing',
    'प्रसव के बाद', 'स्तनपान', 'ప్రసవం తర్వాత', 'పాలివ్వడం',
    'பிரசவத்திற்கு பின்', 'தாய்ப்பால்', 'ಹೆರಿಗೆಯ ನಂತರ', 'ದೊಡ್ಡ ಹಾಲು',
    'പ്രസവാനന്തരം', 'മുലയൂട്ടൽ', 'बाळंतपण', 'प्रसूतीनंतर', 'প্রসবের পর', 'বুকের দুধ',
  ],

  breathingDistress: [
    'trouble breathing', 'difficulty breathing', 'cannot breathe', "can't breathe",
    'not breathing', 'struggling to breathe', 'gasping', 'grunting', 'wheezing',
    'fast breathing', 'rapid breathing', 'shortness of breath', 'breathless', 'chest indrawing',
    'सांस लेने में', 'सांस नहीं', 'सांस फूल', 'दम घुट',
    'శ్వాస తీసుకోవడంలో', 'ఊపిరి ఆడట', 'శ్వాస ఆడ', 'ఊపిరి తీసుకోలేక',
    'மூச்சுத்திணறல்', 'மூச்சு விட சிரமம்', 'மூச்சு திணறுது',
    'ಉಸಿರಾಟದ ತೊಂದರೆ', 'ಉಸಿರಾಡಲು ಕಷ್ಟ', 'ಉಸಿರು ಕಟ್ಟ',
    'ശ്വാസതടസ്സം', 'ശ്വാസമെടുക്കാൻ ബുദ്ധിമുട്ട്',
    'श्वास घेण्यास त्रास', 'दम लागणे', 'श्वास कोंडणे',
    'শ্বাসকষ্ট', 'শ্বাস নিতে কষ্ট',
  ],
  cyanosis: [
    'blue lips', 'blue skin', 'turning blue', 'grey skin', 'gray skin', 'pale and blue', 'dusky',
    'नीला', 'नीले होंठ', 'नीली', 'నీలం', 'నీలిరంగు', 'పెదవులు నీలం',
    'உதடு நீலம்', 'நீல நிறம்', 'ತುಟಿ ನೀಲಿ', 'ನೀಲಿ ಬಣ್ಣ',
    'ചുണ്ട് നീല', 'നീല നിറം', 'ओठ निळे', 'निळे पडणे', 'ঠোঁট নীল', 'নীলচে',
  ],
  unresponsive: [
    'unresponsive', 'unconscious', 'not waking', "won't wake", 'will not wake', 'limp',
    'floppy', 'passed out', 'collapsed', 'fainted', 'faint', 'lifeless', 'hard to wake',
    'बेहोश', 'होश नहीं', 'जाग नहीं', 'निढाल',
    'స్పృహ', 'స్పృహ లేదు', 'నిస్తేజ', 'లేవడం లేదు', 'నిర్జీవ',
    'மயக்கம்', 'அசைவற்று', 'எழவில்லை', 'ಪ್ರಜ್ಞಾಹೀನ', 'ಪ್ರಜ್ಞೆ ಇಲ್ಲ', 'ಎದ್ದೇಳುತ್ತಿಲ್ಲ',
    'ബോധമില്ല', 'അനക്കമില്ല', 'शुद्ध हरपणे', 'हालचाल नाही', 'অজ্ঞান', 'সাড়া নেই', 'নিস্তেজ',
  ],
  seizure: [
    'seizure', 'seizures', 'convulsion', 'convulsions', 'fitting', 'twitching all over',
    'दौरा', 'दौरे', 'मिर्गी', 'ऐंठन', 'మూర్ఛ', 'ఫిట్స్', 'మెలికలు',
    'வலிப்பு', 'இசிவு', 'ಫಿಟ್ಸ್', 'ಮೂರ್ಛೆ', 'ഫിറ്റ്സ്', 'അപസ്മാരം',
    'झटके', 'आचके', 'খিঁচুনি', 'ফিট',
  ],
  severeBleeding: [
    'heavy bleeding', 'severe bleeding', 'bleeding a lot', 'wont stop bleeding',
    "won't stop bleeding", 'hemorrhage', 'haemorrhage', 'blood loss',
    'बहुत खून', 'खून बह', 'रक्तस्राव', 'రక్తస్రావం', 'ఎక్కువ రక్తం',
    'அதிக ரத்தப்போக்கு', 'ரத்தம் கொட்டுது', 'ಹೆಚ್ಚು ರಕ್ತಸ್ರಾವ',
    'കടുത്ത രക്തസ്രാവം', 'अति रक्तस्त्राव', 'অতিরিক্ত রক্তপাত',
  ],
  vaginalBleeding: [
    'vaginal bleeding', 'bleeding down there', 'spotting blood', 'blood spotting',
    'योनि से खून', 'యోని రక్తస్రావం', 'யோனி ரத்தப்போக்கு', 'ಯೋನಿ ರಕ್ತಸ್ರಾವ',
  ],
  reducedFetalMovement: [
    'baby not moving', 'baby is not moving', 'not moving', 'moving less', 'less movement',
    'not felt the baby', 'no kicks', 'fewer kicks', 'reduced movement', 'movements have reduced',
    'fetal movement', 'baby stopped moving', 'stopped moving', 'not kicking',
    'बच्चा हिल नहीं', 'हलचल नहीं', 'हिल नहीं रहा', 'కదలిక లేదు', 'బిడ్డ కదలడం లేదు', 'కదలడం లేదు',
    'குழந்தை அசையவில்லை', 'அசைவு குறைவு', 'ಮಗುವಿನ ಚಲನೆ ಇಲ್ಲ', 'ಕುഞ്ഞിന്റെ അനക്കമില്ല',
    'बाळाची हालचाल नाही', 'বাচ্চার নড়াচড়া নেই',
  ],
  fluidLeak: [
    'water broke', 'waters broke', 'fluid leaking', 'amniotic fluid', 'gush of fluid',
    'पानी की थैली', 'पानी टूट', 'ఉమ్మనీరు', 'నీరు పోతోంది',
    'பனிக்குட நீர்', 'ನೀರು ಹೋಗುವುದು', 'വെള്ളം പോവുക', 'पाणी जाणे', 'জল ভাঙা',
  ],
  preeclampsia: [
    'severe headache with blurred vision', 'blurred vision', 'blurry vision', 'seeing spots',
    'flashing lights', 'sudden swelling of face', 'face swelling',
    'धुंधला दिखाई', 'चेहरे पर सूजन', 'కళ్లు మసక', 'ముఖం వాపు',
    'பார்வை மங்குதல்', 'முக வீக்கம்', 'ಕಣ್ಣು ಮಸುಕು', 'ಮುಖದ ಊತ',
    'കാഴ്ച മങ്ങൽ', 'മുഖത്ത് നീര്', 'डोळ्यांसमोर अंधारी', 'चेहऱ्यावर सूज', 'চোখে ঝাপসা', 'মুখ ফোলা',
  ],
  heatStroke: [
    'heat stroke', 'heatstroke', 'confused and hot', 'hot dry skin', 'stopped sweating',
    'लू लग', 'गर्मी से बेहोश', 'వడదెబ్బ', 'ఎండదెబ్బ',
    'வெயில் மயக்கம்', 'சூடு தாக்கம்', 'ಬಿಸಿಲು ಹೊಡೆತ', 'ಸೂರ്യാഘാതം', 'उष्माघात', 'ऊन लागणे', 'সানস্ট্রোক', 'লু লাগা',
  ],
  chestPain: [
    'chest pain', 'crushing chest', 'pain in my chest', 'tightness in chest',
    'सीने में दर्द', 'ఛాతీ నొప్పి', 'மார்பு வலி', 'ಎದೆ ನೋವು', 'നെഞ്ചുവേദന', 'छातीत दुखणे', 'বুকে ব্যথা',
  ],
  fever: [
    'fever', 'feverish', 'high temperature', 'बुखार', 'ज्वर', 'జ్వరం', 'జ్వరము',
    'காய்ச்சல்', 'ಜ್ವರ', 'പനി', 'ताप', 'জ্বর',
  ],
  dehydrationInfant: [
    'sunken soft spot', 'sunken fontanelle', 'no wet diaper', 'no wet nappy', 'fewer wet diapers',
    'no tears', 'dry mouth', 'not passed urine', 'no urine',
    'सूखा', 'पेशाब नहीं', 'మూత్రం రావడం లేదు', 'ఎండిన',
    'சிறுநீர் போகவில்லை', 'ಮೂತ್ರ ಮಾಡಿಲ್ಲ', 'മൂത്രം പോകുന്നില്ല', 'लघवी नाही', 'প্রস্রাব বন্ধ',
  ],
  poorFeeding: [
    'refusing feeds', 'refusing to feed', 'not feeding', 'wont feed', "won't feed",
    'not drinking', 'दूध नहीं पी', 'పాలు తాగడం లేదు', 'తినడం లేదు',
    'பால் குடிக்கவில்லை', 'ಹಾಲು ಕುಡಿಯುತ್ತಿಲ್ಲ', 'പാൽ കുടിക്കുന്നില്ല', 'दूध पीत नाही', 'দুধ খাচ্ছে না',
  ],
  selfHarm: [
    'suicide', 'kill myself', 'end my life', 'want to die', 'harm myself', 'self harm',
    'आत्महत्या', 'मरना चाहती', 'ఆత్మహత్య', 'చనిపోవాలని',
    'தற்கொலை', 'ಆತ್ಮಹತ್ಯೆ', 'ആത്മഹത്യ', 'आत्महत्या', 'আত্মহত্যা',
  ],
  dosingRequest: [
    'how much', 'what dose', 'how many mg', 'dosage', 'how many ml', 'how many tablets',
    'kitni', 'कितनी खुराक', 'कितना दूं', 'ఎంత మోతాదు', 'ఎన్ని మాత్రలు',
    'எவ்வளவு மருந்து', 'ಎಷ್ಟು ಡೋಸ್', 'എത്ര അളവ്', 'किती डोस', 'কতটা ওষুধ',
  ],
};

// ───────────────────────────────────────────────────────────────────────────
// Subject resolution
// ───────────────────────────────────────────────────────────────────────────

/**
 * Resolve who the message is about. Returns `unknown` rather than guessing —
 * the audited system defaulted every user to a pregnant adult, which pushed
 * adult obstetric rules onto infants.
 *
 * @returns {{ subject: SubjectType, ageMonths: number|null, confidence: number }}
 */
export function resolveSubject(text, profile = {}) {
  const ageMonths = extractAgeMonths(text);
  const saysPregnant = matchesAny(text, LEX.pregnantSubject);

  // During pregnancy "my baby" means the fetus. "I am pregnant and my baby is
  // not moving" is a fetal-movement emergency, not an infant one — so an
  // explicit pregnancy statement combined with fetal-context language must
  // outrank the generic infant lexicon.
  if (
    saysPregnant &&
    matchesAny(text, [...LEX.reducedFetalMovement, ...LEX.fluidLeak, 'kicks', 'kicking', 'kick', 'womb', 'trimester', 'due date'])
  ) {
    return { subject: 'pregnant_person', ageMonths: null, confidence: 0.9 };
  }

  if (matchesAny(text, LEX.infantSubject)) {
    const infantByAge = ageMonths === null ? null : ageMonths < 12;
    if (infantByAge === false) return { subject: 'child', ageMonths, confidence: 0.95 };
    return { subject: 'infant', ageMonths, confidence: ageMonths === null ? 0.8 : 0.95 };
  }
  if (matchesAny(text, LEX.childSubject)) return { subject: 'child', ageMonths, confidence: 0.85 };
  if (matchesAny(text, LEX.pregnantSubject)) return { subject: 'pregnant_person', ageMonths: null, confidence: 0.9 };
  if (matchesAny(text, LEX.postpartumSubject)) return { subject: 'postpartum_person', ageMonths: null, confidence: 0.85 };

  // Only fall back to a stored profile that was actually captured from the user.
  if (profile.subjectType && SUBJECT_TYPES.includes(profile.subjectType)) {
    return { subject: profile.subjectType, ageMonths, confidence: 0.6 };
  }
  if (profile.isPregnant === true) return { subject: 'pregnant_person', ageMonths: null, confidence: 0.6 };

  return { subject: 'unknown', ageMonths, confidence: 0.3 };
}

// ───────────────────────────────────────────────────────────────────────────
// Red-flag rules
// ───────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} Rule
 * @property {string} id
 * @property {string} code            machine-readable reason code
 * @property {string} label           patient-safe description (shown to users)
 * @property {RiskLevel} risk
 * @property {SubjectType[]|null} subjects  null = applies to every subject
 * @property {(ctx: any) => boolean} test
 */

/** @type {Rule[]} */
export const RULES = [
  // ── Airway / breathing / circulation — every subject ────────────────────
  {
    id: 'RF_RESP_DISTRESS',
    code: 'RESPIRATORY_DISTRESS',
    label: 'difficulty breathing',
    risk: 'emergency',
    subjects: null,
    test: (c) => matchesAny(c.text, LEX.breathingDistress) || c.signals.breathingDifficulty === true,
  },
  {
    id: 'RF_CYANOSIS',
    code: 'CYANOSIS',
    label: 'blue or grey lips or skin',
    risk: 'emergency',
    subjects: null,
    test: (c) => matchesAny(c.text, LEX.cyanosis) || c.signals.cyanosis === true,
  },
  {
    id: 'RF_UNRESPONSIVE',
    code: 'ALTERED_CONSCIOUSNESS',
    label: 'unresponsiveness or extreme drowsiness',
    risk: 'emergency',
    subjects: null,
    test: (c) => matchesAny(c.text, LEX.unresponsive) || c.signals.unresponsive === true,
  },
  {
    id: 'RF_SEIZURE',
    code: 'SEIZURE',
    label: 'a seizure or convulsion',
    risk: 'emergency',
    subjects: null,
    test: (c) => matchesAny(c.text, LEX.seizure) || c.signals.seizure === true,
  },
  {
    id: 'RF_SEVERE_BLEEDING',
    code: 'SEVERE_BLEEDING',
    label: 'heavy bleeding',
    risk: 'emergency',
    subjects: null,
    test: (c) => matchesAny(c.text, LEX.severeBleeding) || c.signals.severeBleeding === true,
  },
  {
    id: 'RF_SELF_HARM',
    code: 'SELF_HARM_RISK',
    label: 'thoughts of self-harm',
    risk: 'emergency',
    subjects: null,
    test: (c) => matchesAny(c.text, LEX.selfHarm) || c.signals.selfHarm === true,
  },
  {
    id: 'RF_HEAT_STROKE',
    code: 'SUSPECTED_HEAT_STROKE',
    label: 'signs of heat stroke',
    risk: 'emergency',
    subjects: null,
    test: (c) => matchesAny(c.text, LEX.heatStroke) || c.signals.heatStroke === true,
  },

  // ── Infant-specific ────────────────────────────────────────────────────
  {
    id: 'RF_INFANT_FEVER_UNDER_3M',
    code: 'INFANT_FEVER_UNDER_3_MONTHS',
    label: 'fever in a baby under 3 months',
    risk: 'emergency',
    subjects: ['infant'],
    // Any fever in an infant under 3 months warrants immediate assessment.
    // Age unknown counts: under-triaging a neonate is the costlier error.
    test: (c) => {
      const feverish = matchesAny(c.text, LEX.fever) || c.signals.fever === true;
      if (!feverish && (c.temperatureC === null || c.temperatureC < 38)) return false;
      const hot = c.temperatureC === null ? feverish : c.temperatureC >= 38;
      if (!hot) return false;
      return c.ageMonths === null || c.ageMonths < 3;
    },
  },
  {
    id: 'RF_INFANT_HIGH_FEVER',
    code: 'INFANT_HIGH_FEVER',
    label: 'a high fever in a young child',
    risk: 'high',
    subjects: ['infant', 'child'],
    test: (c) => c.temperatureC !== null && c.temperatureC >= 39,
  },
  {
    id: 'RF_INFANT_DEHYDRATION',
    code: 'INFANT_DEHYDRATION',
    label: 'signs of dehydration',
    risk: 'high',
    subjects: ['infant', 'child'],
    test: (c) => matchesAny(c.text, LEX.dehydrationInfant) || c.signals.dehydration === true,
  },
  {
    id: 'RF_INFANT_POOR_FEEDING',
    code: 'POOR_FEEDING',
    label: 'refusing feeds',
    risk: 'high',
    subjects: ['infant'],
    test: (c) => matchesAny(c.text, LEX.poorFeeding) || c.signals.poorFeeding === true,
  },

  // ── Pregnancy-specific ─────────────────────────────────────────────────
  {
    id: 'RF_REDUCED_FETAL_MOVEMENT',
    code: 'REDUCED_FETAL_MOVEMENT',
    label: 'reduced fetal movement',
    risk: 'emergency',
    subjects: ['pregnant_person'],
    test: (c) => matchesAny(c.text, LEX.reducedFetalMovement) || c.signals.reducedFetalMovement === true,
  },
  {
    id: 'RF_VAGINAL_BLEEDING',
    code: 'VAGINAL_BLEEDING_IN_PREGNANCY',
    label: 'bleeding during pregnancy',
    risk: 'emergency',
    subjects: ['pregnant_person', 'postpartum_person'],
    test: (c) => matchesAny(c.text, LEX.vaginalBleeding) || c.signals.vaginalBleeding === true,
  },
  {
    id: 'RF_FLUID_LEAK',
    code: 'AMNIOTIC_FLUID_LEAK',
    label: 'fluid leaking',
    risk: 'emergency',
    subjects: ['pregnant_person'],
    test: (c) => matchesAny(c.text, LEX.fluidLeak) || c.signals.fluidLeak === true,
  },
  {
    id: 'RF_PREECLAMPSIA',
    code: 'PREECLAMPSIA_WARNING_SIGNS',
    label: 'vision changes or facial swelling in pregnancy',
    risk: 'emergency',
    subjects: ['pregnant_person', 'postpartum_person'],
    test: (c) => matchesAny(c.text, LEX.preeclampsia) || c.signals.preeclampsiaSigns === true,
  },
  {
    id: 'RF_MATERNAL_FEVER',
    code: 'MATERNAL_FEVER',
    label: 'fever during pregnancy',
    risk: 'high',
    subjects: ['pregnant_person', 'postpartum_person'],
    test: (c) =>
      (c.temperatureC !== null && c.temperatureC >= 38) ||
      ((matchesAny(c.text, LEX.fever) || c.signals.fever === true) && c.signals.severity === 'severe'),
  },

  // ── Adult ──────────────────────────────────────────────────────────────
  {
    id: 'RF_CHEST_PAIN',
    code: 'CHEST_PAIN',
    label: 'chest pain',
    risk: 'emergency',
    subjects: ['adult', 'pregnant_person', 'postpartum_person', 'unknown'],
    test: (c) => matchesAny(c.text, LEX.chestPain) || c.signals.chestPain === true,
  },
  {
    id: 'RF_ADULT_HIGH_FEVER',
    code: 'HIGH_FEVER',
    label: 'a high fever',
    risk: 'high',
    subjects: ['adult', 'unknown'],
    test: (c) => c.temperatureC !== null && c.temperatureC >= 39.4,
  },
];

const RISK_ORDER = { low: 0, moderate: 1, high: 2, emergency: 3 };

// ───────────────────────────────────────────────────────────────────────────
// Subject-appropriate emergency actions
//
// The audited system emitted one template for everyone: "lie on your left side
// to maximise placental blood flow" and "sip ORS" — sent to a parent whose
// infant could not breathe. Offering oral fluids to anyone in respiratory
// distress is an aspiration risk. Actions are therefore selected by subject AND
// by presentation.
// ───────────────────────────────────────────────────────────────────────────

function emergencyActions(subject, codes) {
  const has = (c) => codes.includes(c);
  const airwayCompromise = has('RESPIRATORY_DISTRESS') || has('CYANOSIS') || has('ALTERED_CONSCIOUSNESS') || has('SEIZURE');
  const steps = [];

  if (has('SELF_HARM_RISK')) {
    return [
      'You do not have to handle this alone, and support is available right now.',
      'In India, Tele-MANAS is free and confidential, 24/7: *14416*.',
      'If you are in immediate danger, call *112* or go to the nearest emergency department.',
      'If someone you trust is nearby, ask them to stay with you.',
    ];
  }

  steps.push('*Call emergency services now — 112 in India — or go straight to the nearest emergency department.*');

  if (PEDIATRIC_SUBJECTS.includes(subject)) {
    if (airwayCompromise) {
      steps.push('Keep your baby upright and supported so the airway stays open. Loosen any tight clothing.');
      steps.push('*Do not give any food, milk, water or ORS while breathing is difficult* — it can be inhaled into the lungs.');
      steps.push('Do not put anything in their mouth. Stay with them and keep them calm.');
    } else {
      steps.push('Keep your baby comfortable and in a cool, well-ventilated space. Remove extra layers.');
      steps.push('Keep offering breastmilk or formula if they will take it. No plain water under 6 months.');
    }
  } else if (subject === 'pregnant_person' || subject === 'postpartum_person') {
    if (airwayCompromise) {
      steps.push('Sit upright, loosen tight clothing, and do not eat or drink anything.');
    } else {
      steps.push('Rest on your left side while you wait — it eases pressure on the main blood vessels.');
      steps.push('Sip water if you are fully alert and not vomiting.');
    }
  } else {
    if (airwayCompromise) {
      steps.push('Sit upright and loosen tight clothing. Do not eat or drink anything.');
    } else {
      steps.push('Rest somewhere cool and shaded. Sip water if you are fully alert and not vomiting.');
    }
  }

  steps.push('If you can, have someone else travel with you.');
  return steps;
}

// ───────────────────────────────────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────────────────────────────────

/**
 * Evaluate clinical safety. Deterministic and side-effect free.
 *
 * @param {Object} params
 * @param {string} params.text            raw user message (any language)
 * @param {SubjectType=} params.subject   caller-resolved subject; resolved here if absent
 * @param {Object=} params.signals        structured signals extracted by the LLM
 * @param {Object=} params.profile        stored, consented profile
 * @param {Object=} params.climate        normalized climate data, if known
 * @returns {{
 *   riskLevel: RiskLevel, subject: SubjectType, ageMonths: number|null,
 *   redFlags: string[], reasonCodes: string[], requiresReferral: boolean,
 *   requiresImmediateAction: boolean, emergencyActions: string[],
 *   constraints: string[], ruleVersion: string
 * }}
 */
export function evaluateSafety(params) {
  const text = String(params.text || '');
  const signals = params.signals || {};
  const profile = params.profile || {};

  const resolved = params.subject && SUBJECT_TYPES.includes(params.subject)
    ? { subject: params.subject, ageMonths: extractAgeMonths(text), confidence: 0.9 }
    : resolveSubject(text, profile);

  const ctx = {
    text,
    signals,
    subject: resolved.subject,
    ageMonths: resolved.ageMonths ?? (typeof profile.ageMonths === 'number' ? profile.ageMonths : null),
    temperatureC: typeof signals.temperatureC === 'number' ? signals.temperatureC : extractStatedTemperatureC(text),
    climate: params.climate || null,
  };

  /** @type {RiskLevel} */
  let riskLevel = 'low';
  const redFlags = [];
  const reasonCodes = [];

  for (const rule of RULES) {
    if (rule.subjects && !rule.subjects.includes(ctx.subject)) continue;
    let hit = false;
    try {
      hit = rule.test(ctx);
    } catch {
      hit = false; // a broken rule must never crash the pipeline
    }
    if (!hit) continue;
    redFlags.push(rule.label);
    reasonCodes.push(rule.code);
    if (RISK_ORDER[rule.risk] > RISK_ORDER[riskLevel]) riskLevel = rule.risk;
  }

  // Climate exposure raises the floor but never on its own creates an emergency.
  if (ctx.climate && typeof ctx.climate.feels_like_c === 'number') {
    if (ctx.climate.feels_like_c >= 45 && RISK_ORDER[riskLevel] < RISK_ORDER.moderate) {
      riskLevel = 'moderate';
      reasonCodes.push('EXTREME_HEAT_EXPOSURE');
    }
  }

  const constraints = buildConstraints(ctx.subject, ctx.ageMonths, text, reasonCodes);

  return {
    riskLevel,
    subject: ctx.subject,
    ageMonths: ctx.ageMonths,
    redFlags,
    reasonCodes,
    requiresReferral: RISK_ORDER[riskLevel] >= RISK_ORDER.high,
    requiresImmediateAction: riskLevel === 'emergency',
    emergencyActions: riskLevel === 'emergency' ? emergencyActions(ctx.subject, reasonCodes) : [],
    ruleVersion: SAFETY_RULE_VERSION,
    constraints,
  };
}

/**
 * Hard constraints handed to the model as non-negotiable instructions. These
 * are what keep the model from inventing a dose or an adult fluid target, and
 * they are identical regardless of the language the user wrote in.
 */
export function buildConstraints(subject, ageMonths, text, reasonCodes = []) {
  const c = [
    'Never state a medication name together with a dose, strength or frequency. Direct the user to their doctor or pharmacist instead.',
    'Never claim a diagnosis. Describe what the symptoms could mean and when to seek care.',
    'Never state a temperature, AQI, UV or humidity figure that was not supplied to you in the context block.',
    'Never name a clinic, hospital, doctor or referral ticket that was not supplied to you in the context block.',
  ];

  if (PEDIATRIC_SUBJECTS.includes(subject)) {
    c.push('This is about a baby or child. Never give adult fluid targets in litres, adult medication doses, or adult positioning advice.');
    c.push('Give fluid guidance as feeds or small frequent sips, never as a litre target.');
    if (ageMonths === null || ageMonths < 6) {
      c.push('If the child may be under 6 months, state clearly that they should receive breastmilk or formula only — never plain water.');
    }
  }
  if (subject === 'pregnant_person') {
    c.push('The user is pregnant. Flag pregnancy-specific warning signs: reduced fetal movement, bleeding, fluid leaking, severe headache with vision changes, facial swelling.');
  }
  if (subject === 'unknown') {
    c.push('You do not know who this is about. Do not assume the user is pregnant, and do not assume an age. Ask before giving advice that depends on either.');
  }
  if (matchesAny(text, LEX.dosingRequest)) {
    c.push('The user is asking about a dose. You must decline to give one and refer them to a clinician or pharmacist — dosing depends on age and weight.');
  }
  if (reasonCodes.includes('RESPIRATORY_DISTRESS') || reasonCodes.includes('CYANOSIS')) {
    c.push('Breathing is compromised. Do not suggest giving anything by mouth — no water, ORS, milk or medicine.');
  }
  return c;
}

/**
 * Compose the final user-facing message.
 *
 * The escalation banner is PREPENDED to the model's answer; the model's content
 * is never discarded and never allowed to downgrade the decision. This replaces
 * the audited behaviour where an emergency wholesale-replaced a correct,
 * subject-appropriate response with a fixed adult template.
 */
export function composeSafeResponse({ safety, modelText, disclaimer = true }) {
  let body = String(modelText || '').trim();
  const parts = [];

  // Strip duplicate emergency or high-risk banners if modelText already contains them
  if (safety.riskLevel === 'emergency') {
    body = body
      .replace(/^🚨\s*\*?This needs emergency medical care now\*?\s*/i, '')
      .replace(/^What you described.*?life-threatening quickly\.\s*/i, '')
      .replace(/^---\s*/, '')
      .trim();

    const flags = safety.redFlags.length ? ` (${safety.redFlags.join(', ')})` : '';
    parts.push(`🚨 *This needs emergency medical care now*`);
    parts.push(`What you described${flags} can become life-threatening quickly.`);
    if (safety.emergencyActions && safety.emergencyActions.length) {
      parts.push(safety.emergencyActions.map((s, i) => `${i + 1}. ${s}`).join('\n'));
    }
    if (body) parts.push(`---\n${body}`);
  } else if (safety.riskLevel === 'high') {
    body = body
      .replace(/^⚠️\s*\*?Please see a healthcare provider today\*?\s*/i, '')
      .replace(/^Because of:\s*.*?\.\s*/i, '')
      .replace(/_If anything gets worse.*?call 112 straight away\._\s*/i, '')
      .trim();

    parts.push(`⚠️ *Please see a healthcare provider today*`);
    if (safety.redFlags.length) parts.push(`Because of: ${safety.redFlags.join(', ')}.`);
    if (body) parts.push(body);
    parts.push('_If anything gets worse — breathing changes, drowsiness, or a seizure — call 112 straight away._');
  } else {
    if (body) parts.push(body);
  }

  // Strip trailing disclaimer if already present in body
  body = body.replace(/_dayli gives general guidance, not a diagnosis\. For emergencies call 112\._\s*$/i, '').trim();

  if (disclaimer) {
    const disclaimerText = '_dayli gives general guidance, not a diagnosis. For emergencies call 112._';
    if (!parts.some((p) => p.includes('dayli gives general guidance'))) {
      parts.push(disclaimerText);
    }
  }
  return parts.filter(Boolean).join('\n\n');
}

/**
 * Post-generation validation. Catches a model that ignored its constraints.
 * Returns the corrected text plus what was corrected, for the audit trail.
 */
export function validateModelOutput({ text, safety }) {
  let out = String(text || '');
  const violations = [];

  // 1. Remove markdown headers (### Header -> Header)
  out = out.replace(/^#{1,6}\s+/gm, '');
  // 2. Remove markdown double asterisks (**bold** -> bold)
  out = out.replace(/\*\*(.*?)\*\*/gs, '$1');
  // 3. Remove any leftover double asterisks
  out = out.replace(/\*\*/g, '');
  // 4. Clean bullet items: remove asterisks on keywords (• *Diaper:* -> • Diaper:, • *Swaddle* -> • Swaddle)
  out = out.replace(/([•\-\*]\s*)\*+([^*\n]+?)\*+/g, '$1$2');
  // 5. Clean standalone header lines wrapped in asterisks (*Basic needs* -> Basic needs)
  out = out.replace(/^(\s*)\*+([^*\n]+?)\*+(\s*)$/gm, '$1$2$3');
  // 6. Clean malformed colon inside asterisks like *word:* -> word:
  out = out.replace(/\*+([^*\n]+?):\*+/g, '$1:');

  // A stated drug dose is never acceptable from the model.
  const dosePattern = /\b(\d+(?:\.\d+)?)\s*(mg|ml|mcg|g)\b/gi;
  if (dosePattern.test(out)) {
    out = out.replace(dosePattern, '[dose removed]');
    violations.push('STATED_MEDICATION_DOSE');
  }

  // Adult litre targets must never appear on a pediatric path.
  if (PEDIATRIC_SUBJECTS.includes(safety.subject)) {
    const litres = /\b\d+(?:\.\d+)?\s*(?:l\b|lit(?:re|er)s?)\b/gi;
    if (litres.test(out)) {
      out = out.replace(litres, 'frequent feeds or small sips');
      violations.push('ADULT_HYDRATION_TARGET_ON_PEDIATRIC_PATH');
    }
  }

  // The model may not talk someone down from a deterministic emergency.
  if (safety.riskLevel === 'emergency') {
    const reassurance = /\b(no need to worry|not(?:hing)? serious|this is normal|nothing to worry about|is natural|perfectly normal)\b/gi;
    if (reassurance.test(out)) {
      out = out.replace(reassurance, '[removed]');
      violations.push('DOWNGRADED_EMERGENCY');
    }
  }

  // Strip incomplete or duplicate trailing disclaimers produced by the LLM
  out = out.replace(/(?:_)?\s*(?:dayli|i)\s+gives?\s+general\s+guidance[^\n]*$/i, '').trim();

  return { text: out, violations };
}

export default {
  SAFETY_RULE_VERSION,
  RULES,
  resolveSubject,
  evaluateSafety,
  buildConstraints,
  composeSafeResponse,
  validateModelOutput,
  extractStatedTemperatureC,
  extractAgeMonths,
};
