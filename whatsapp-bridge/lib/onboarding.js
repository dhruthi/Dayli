/**
 * Consent capture and profile onboarding.
 *
 * Why this exists: the audited system had no onboarding at all. It invented a
 * profile for every unrecognised number — a name, a pregnancy, a trimester and
 * a city — and then personalised against that fiction. It also stored health
 * context with no consent record, while the public site promised "individual
 * health data is never shared without your explicit consent".
 *
 * Design constraints:
 *  • Ask the minimum. Who the guidance is for, and where they are. Nothing else
 *    is collected, because nothing else is needed to be useful.
 *  • Consent is explicit, versioned and timestamped, and it is revocable in one
 *    message ("stop").
 *  • Every step is skippable. A user who declines still gets general guidance;
 *    they just do not get personalisation. Refusing to answer must never block
 *    someone from asking an urgent health question.
 *  • Onboarding NEVER blocks an emergency. The caller checks the deterministic
 *    safety verdict first — a person whose baby cannot breathe is not asked
 *    which trimester they are in.
 */

import { increment as metric } from './metrics.js';
import {
  t,
  normalizeLocale,
  detectLocale,
  resolveLocale,
  isLanguageCommand,
  parseLanguageSelection,
  getLanguageMenu,
  getLanguageSwitchedMessage,
} from './i18n/index.js';

export { detectLocale, resolveLocale };

export const CONSENT_VERSION = '2026-08-1';

export const STEPS = {
  LANGUAGE: 'language',
  CONSENT: 'consent',
  SUBJECT: 'subject',
  CHILD_AGE: 'child_age',
  PREGNANCY_STAGE: 'pregnancy_stage',
  LOCATION: 'location',
  DONE: 'done',
};

/** Button and list ids. Prefixed so a free-text reply can never collide. */
const ID = {
  consentYes: 'ob_consent_yes',
  consentNo: 'ob_consent_no',
  consentTerms: 'ob_consent_terms',
  optOut: 'ob_opt_out',
  subjPrefix: 'ob_subj_',
  agePrefix: 'ob_age_',
  pregPrefix: 'ob_preg_',
  locSkip: 'ob_loc_skip',
  feedbackYes: 'ob_fb_yes',
  feedbackNo: 'ob_fb_no',
  symPrefix: 'sym_',
};

/**
 * Interactive symptom checker.
 *
 * A bare symptom word ("fever", "crying", "heat") carries none of the detail
 * that changes the answer — a fever in a 6-week-old is an emergency, the same
 * number in a four-year-old usually is not. Rather than guess or ask an
 * open question the user has to type an answer to, we offer the one
 * distinction that actually routes the guidance.
 */
const SYMPTOM_TRIGGERS = {
  fever: [
    'fever', 'జ్వరం', 'బుఖార్', 'बुखार', 'ज्वर',
    'காய்ச்சல்', 'சுரம்', 'ಜ್ವರ', 'പനി', 'ताप', '\u099c\u09cd\u09ac\u09b0'
  ],
  crying: [
    'crying', 'cry', 'ఏడుపు', 'ఏడుస్తోంది', 'रो रहा है', 'रोना',
    'அழுகை', 'அழுகிறான்', 'அழுகிறாள்', 'ಅಳು', 'ಅಳುತ್ತಿದೆ',
    'കരച്ചിൽ', 'കരയുന്നു', 'रडणे', 'रडत आहे', 'কান্না', 'কাঁদছে'
  ],
  heat: [
    'heat', 'heatwave', 'too hot', 'ఎండ', 'వేడి', 'गर्मी', 'लू',
    'வெயில்', 'சூடு', 'அனல்', 'ಬಿಸಿಲು', 'ಶಾಖ', 'ಸೆಕೆ',
    'ചൂട്', 'വേനൽ', 'उष्णता', 'ऊन', 'गरमी', 'গরম', 'তাপপ্রবাহ'
  ],
};

const SYMPTOM_PROMPTS = {
  fever: {
    en: {
      body: 'Who has the fever and what is their age?',
      buttons: [
        { id: 'sym_fever_under3m', title: 'Under 3 months' },
        { id: 'sym_fever_infant', title: '3 to 12 months' },
        { id: 'sym_fever_older', title: 'Older child / Adult' },
      ],
    },
    te: {
      body: 'జ్వరం ఎవరికి వచ్చింది మరియు వారి వయస్సు ఎంత?',
      buttons: [
        { id: 'sym_fever_under3m', title: '3 నెలల లోపు' },
        { id: 'sym_fever_infant', title: '3-12 నెలలు' },
        { id: 'sym_fever_older', title: 'పెద్దవారు' },
      ],
    },
    hi: {
      body: 'बुखार किसे है और उनकी आयु क्या है?',
      buttons: [
        { id: 'sym_fever_under3m', title: '3 माह से छोटा' },
        { id: 'sym_fever_infant', title: '3-12 माह' },
        { id: 'sym_fever_older', title: 'बड़ा बच्चा/वयस्क' },
      ],
    },
    ta: {
      body: 'யாருக்கு காய்ச்சல் மற்றும் அவர்களின் வயது என்ன?',
      buttons: [
        { id: 'sym_fever_under3m', title: '3 மாதத்திற்குள்' },
        { id: 'sym_fever_infant', title: '3 முதல் 12 மாதம்' },
        { id: 'sym_fever_older', title: 'பெரியவர்/குழந்தை' },
      ],
    },
    kn: {
      body: 'ಜ್ವರ ಯಾರಿಗೆ ಬಂದಿದೆ ಮತ್ತು ಅವರ ವಯಸ್ಸು ಎಷ್ಟು?',
      buttons: [
        { id: 'sym_fever_under3m', title: '3 ತಿಂಗಳ ಒಳಗೆ' },
        { id: 'sym_fever_infant', title: '3 ರಿಂದ 12 ತಿಂಗಳು' },
        { id: 'sym_fever_older', title: 'ಹಿರಿಯ ಮಗು/ವಯಸ್ಕ' },
      ],
    },
    ml: {
      body: 'ആർക്കാണ് പനി, അവരുടെ പ്രായം എത്രയാണ്?',
      buttons: [
        { id: 'sym_fever_under3m', title: '3 മാസത്തിൽ താഴെ' },
        { id: 'sym_fever_infant', title: '3 മുതൽ 12 മാസം' },
        { id: 'sym_fever_older', title: 'മുതിർന്നവർ/കുട്ടി' },
      ],
    },
    mr: {
      body: 'ताप कोणाला आला आहे आणि त्यांचे वय किती आहे?',
      buttons: [
        { id: 'sym_fever_under3m', title: '३ महिन्यांपेक्षा कमी' },
        { id: 'sym_fever_infant', title: '३ ते १२ महिने' },
        { id: 'sym_fever_older', title: 'मोठे मूल/प्रौढ' },
      ],
    },
    bn: {
      body: 'কার জ্বর হয়েছে এবং তার বয়স কত?',
      buttons: [
        { id: 'sym_fever_under3m', title: '৩ মাসের কম' },
        { id: 'sym_fever_infant', title: '৩ থেকে ১২ মাস' },
        { id: 'sym_fever_older', title: 'বড় বাচ্চা/বয়স্ক' },
      ],
    },
  },
  crying: {
    en: {
      body: 'How is the crying right now?',
      buttons: [
        { id: 'sym_cry_inconsolable', title: 'Over 2 hours' },
        { id: 'sym_cry_onoff', title: 'On and off' },
        { id: 'sym_cry_settles', title: 'Settles when held' },
      ],
    },
    te: {
      body: 'ఇప్పుడు ఏడుపు ఎలా ఉంది?',
      buttons: [
        { id: 'sym_cry_inconsolable', title: '2 గంటలకు పైగా' },
        { id: 'sym_cry_onoff', title: 'అప్పుడప్పుడు' },
        { id: 'sym_cry_settles', title: 'ఎత్తుకుంటే ఆగును' },
      ],
    },
    hi: {
      body: 'अभी रोना कैसा है?',
      buttons: [
        { id: 'sym_cry_inconsolable', title: '2 घंटे से ज़्यादा' },
        { id: 'sym_cry_onoff', title: 'रुक-रुक कर' },
        { id: 'sym_cry_settles', title: 'गोद में शांत' },
      ],
    },
    ta: {
      body: 'இப்போது அழுகை எப்படி இருக்கிறது?',
      buttons: [
        { id: 'sym_cry_inconsolable', title: '2 மணிக்கும் மேல்' },
        { id: 'sym_cry_onoff', title: 'விட்டு விட்டு' },
        { id: 'sym_cry_settles', title: 'தூக்கினால் அமைதி' },
      ],
    },
    kn: {
      body: 'ಈಗ ಅಳು ಹೇಗಿದೆ?',
      buttons: [
        { id: 'sym_cry_inconsolable', title: '2 ಗಂಟೆಗೂ ಹೆಚ್ಚು' },
        { id: 'sym_cry_onoff', title: 'ಬಿಟ್ಟು ಬಿಟ್ಟು' },
        { id: 'sym_cry_settles', title: 'ಎತ್ತಿಕೊಂಡರೆ ಶಾಂತ' },
      ],
    },
    ml: {
      body: 'ഇപ്പോൾ കരച്ചിൽ എങ്ങനെയുണ്ട്?',
      buttons: [
        { id: 'sym_cry_inconsolable', title: '2 മണിക്കൂറിലധികം' },
        { id: 'sym_cry_onoff', title: 'ഇടയ്ക്കിടെ' },
        { id: 'sym_cry_settles', title: 'എടുത്താൽ ശാന്തം' },
      ],
    },
    mr: {
      body: 'सध्या रडणे कसे आहे?',
      buttons: [
        { id: 'sym_cry_inconsolable', title: '२ तासांपेक्षा जास्त' },
        { id: 'sym_cry_onoff', title: 'थांबून थांबून' },
        { id: 'sym_cry_settles', title: 'जवळ घेतल्यास शांत' },
      ],
    },
    bn: {
      body: 'এখন কান্না কেমন হচ্ছে?',
      buttons: [
        { id: 'sym_cry_inconsolable', title: '২ ঘণ্টার বেশি' },
        { id: 'sym_cry_onoff', title: 'মাঝে মাঝে' },
        { id: 'sym_cry_settles', title: 'কোলে নিলে শান্ত' },
      ],
    },
  },
  heat: {
    en: {
      body: 'What would you like help with in this heat?',
      buttons: [
        { id: 'sym_heat_severe', title: 'Very hot, no sweat' },
        { id: 'sym_heat_mild', title: 'Fussy and flushed' },
        { id: 'sym_heat_prevent', title: 'Prevention tips' },
      ],
    },
    te: {
      body: 'ఈ ఎండలో మీకు ఏ విషయంలో సహాయం కావాలి?',
      buttons: [
        { id: 'sym_heat_severe', title: 'చాలా వేడిగా ఉంది' },
        { id: 'sym_heat_mild', title: 'చిరాకు, ఎర్రబడటం' },
        { id: 'sym_heat_prevent', title: 'జాగ్రత్తలు' },
      ],
    },
    hi: {
      body: 'इस गर्मी में आपको किस बात में मदद चाहिए?',
      buttons: [
        { id: 'sym_heat_severe', title: 'बहुत गर्म लग रहा' },
        { id: 'sym_heat_mild', title: 'चिड़चिड़ा और लाल' },
        { id: 'sym_heat_prevent', title: 'बचाव के उपाय' },
      ],
    },
    ta: {
      body: 'இந்த வெயிலில் உங்களுக்கு என்ன உதவி வேண்டும்?',
      buttons: [
        { id: 'sym_heat_severe', title: 'அதிக சூடு, வியர்வை' },
        { id: 'sym_heat_mild', title: 'எரிச்சல், சிவத்தல்' },
        { id: 'sym_heat_prevent', title: 'தடுப்பு முறைகள்' },
      ],
    },
    kn: {
      body: 'ಈ ಬಿಸಿಲಿನಲ್ಲಿ ನಿಮಗೆ ಯಾವ ಸಹಾಯ ಬೇಕು?',
      buttons: [
        { id: 'sym_heat_severe', title: 'ತೀವ್ರ ಬಿಸಿಲು' },
        { id: 'sym_heat_mild', title: 'ಕಿರಿಕಿರಿ, ಕೆಂಪು' },
        { id: 'sym_heat_prevent', title: 'ಮುನ್ನೆಚ್ಚರಿಕೆಗಳು' },
      ],
    },
    ml: {
      body: 'ഈ ചൂടിൽ നിങ്ങൾക്ക് എന്ത് സഹായമാണ് വേണ്ടത്?',
      buttons: [
        { id: 'sym_heat_severe', title: 'കഠിന ചൂട്' },
        { id: 'sym_heat_mild', title: 'അസ്വസ്ഥത, ചുവപ്പ്' },
        { id: 'sym_heat_prevent', title: 'പ്രതിരോധം' },
      ],
    },
    mr: {
      body: 'या उष्णतेमध्ये आपल्याला कशात मदत हवी आहे?',
      buttons: [
        { id: 'sym_heat_severe', title: 'खूप गरम, घाम नाही' },
        { id: 'sym_heat_mild', title: 'चिडचिड व लालसर' },
        { id: 'sym_heat_prevent', title: 'बचावाचे उपाय' },
      ],
    },
    bn: {
      body: 'এই গরমে আপনার কী ধরনের সাহায্য প্রয়োজন?',
      buttons: [
        { id: 'sym_heat_severe', title: 'খুব গরম, ঘাম নেই' },
        { id: 'sym_heat_mild', title: 'খিটখিটে ও লালচে' },
        { id: 'sym_heat_prevent', title: 'সুরক্ষার উপায়' },
      ],
    },
  },
};

/**
 * The English question each symptom button stands for. Fed back into the AI
 * pipeline as if the user had typed it, so the model gets the age/severity
 * detail that safety routing depends on regardless of the user's language.
 */
const SYMPTOM_ANSWERS = {
  sym_fever_under3m: 'My baby is under 3 months old and has a fever. What should I do?',
  sym_fever_infant: 'My baby is between 3 and 12 months old and has a fever. What should I do?',
  sym_fever_older: 'My older child has a fever. What should I do?',
  sym_cry_inconsolable:
    'My baby has been crying inconsolably for more than 2 hours and will not settle. What should I do?',
  sym_cry_onoff: 'My baby is crying on and off today. What could be causing it and what should I do?',
  sym_cry_settles:
    'My baby cries but settles when held. Is this normal and what can I do to soothe them?',
  sym_heat_severe:
    'In this heat my child feels very hot to touch and is not sweating. What should I do?',
  sym_heat_mild: 'In this heat my child is fussy and flushed. What should I do?',
  sym_heat_prevent: 'How do I keep my family safe in this heat? Please give prevention tips.',
};

/**
 * Match a message that is *only* a symptom word against the checker.
 *
 * Deliberately exact-match on the trimmed message: someone who typed a real
 * question ("my baby has a fever and is not feeding") has already told us
 * enough, and interrupting them with buttons would be a step backwards.
 *
 * @param {string} text
 * @returns {'fever'|'crying'|'heat'|null}
 */
export function matchSymptomTrigger(text) {
  const t = String(text || '')
    .toLowerCase()
    .replace(/[?!.,]/g, '')
    .trim();
  if (!t) return null;
  for (const [topic, words] of Object.entries(SYMPTOM_TRIGGERS)) {
    if (words.some((w) => t === w.toLowerCase())) return topic;
  }
  return null;
}

/**
 * @param {'fever'|'crying'|'heat'} topic
 * @param {'en'|'te'|'hi'|'ar'} locale
 */
export function symptomPrompt(topic, locale = 'en') {
  const byLocale = SYMPTOM_PROMPTS[topic];
  if (!byLocale) return null;
  const copy = byLocale[locale] || byLocale.en;
  return { kind: 'buttons', body: copy.body, buttons: copy.buttons };
}

/**
 * The question a symptom button id stands for, or null if it is not one.
 * @param {string} replyId
 */
export function symptomAnswer(replyId) {
  return SYMPTOM_ANSWERS[replyId] || null;
}

export function subjectNoun(subjectType, locale = 'en') {
  const norm = normalizeLocale(locale);
  const table = {
    en: {
      infant: 'your baby',
      child: 'your child',
      pregnant_person: 'your pregnancy',
      postpartum_person: 'you',
      unknown: 'you',
    },
    te: {
      infant: 'మీ శిశువు',
      child: 'మీ పిల్లలు',
      pregnant_person: 'మీ గర్భధారణ',
      postpartum_person: 'మీరు',
      unknown: 'మీరు',
    },
    hi: {
      infant: 'आपके शिशु',
      child: 'आपके बच्चे',
      pregnant_person: 'आपकी गर्भावस्था',
      postpartum_person: 'आप',
      unknown: 'आप',
    },
    ta: {
      infant: 'உங்கள் குழந்தை',
      child: 'உங்கள் பிள்ளை',
      pregnant_person: 'உங்கள் கர்ப்பம்',
      postpartum_person: 'நீங்கள்',
      unknown: 'நீங்கள்',
    },
    kn: {
      infant: 'ನಿಮ್ಮ ಮಗು',
      child: 'ನಿಮ್ಮ ಮಕ್ಕಳು',
      pregnant_person: 'ನಿಮ್ಮ ಗರ್ಭಧಾರಣೆ',
      postpartum_person: 'ನೀವು',
      unknown: 'ನೀವು',
    },
    ml: {
      infant: 'നിങ്ങളുടെ കുഞ്ഞ്',
      child: 'നിങ്ങളുടെ കുട്ടി',
      pregnant_person: 'നിങ്ങളുടെ ഗർഭധാരണം',
      postpartum_person: 'നിങ്ങൾ',
      unknown: 'നിങ്ങൾ',
    },
    mr: {
      infant: 'तुमचे बाळ',
      child: 'तुमची मुले',
      pregnant_person: 'तुमची गर्भधारणा',
      postpartum_person: 'तुम्ही',
      unknown: 'तुम्ही',
    },
    bn: {
      infant: 'আপনার শিশু',
      child: 'আপনার সন্তান',
      pregnant_person: 'আপনার গর্ভাবস্থা',
      postpartum_person: 'আপনি',
      unknown: 'আপনি',
    },
  };
  const row = table[norm] || table.en;
  return row[subjectType] || row.unknown;
}

// ── Step 0: language selection ───────────────────────────────────────────

export function languagePrompt(locale = 'en', page = 'main') {
  return getLanguageMenu(locale, page);
}

// ── Step 1: consent ───────────────────────────────────────────────────────

export function consentPrompt(locale = 'en') {
  const loc = normalizeLocale(locale);
  if (loc === 'te') {
    return {
      kind: 'buttons',
      header: 'దశ 1/3: సమ్మతి',
      body:
        "నమస్కారం! నేను డేలీ (dayli) — మీ మరియు మీ కుటుంబ సభ్యుల ఆరోగ్య సహచరిణిని.\n\n" +
        'మీకు సరైన సలహాలు అందించడానికి మీ వివరాలు అవసరం (ఎవరి ఆరోగ్యం మరియు మీ ప్రాంతం).\n\n' +
        '• మీ డేటా గోప్యంగా ఉంటుంది, ఎవరికీ విక్రయించబడదు\n' +
        '• మీరు ఎప్పుడైనా *opt out* లేదా *stop* అని పంపితే మొత్తం తొలగించబడుతుంది\n' +
        '• నేను డాక్టర్‌ను కాను, అత్యవసర సమయాల్లో వైద్యుడిని సంప్రదించండి\n\n' +
        'మనం ప్రారంభించవచ్చా?',
      buttons: [
        { id: ID.consentYes, title: 'ప్రారంభించండి' },
        { id: ID.consentNo, title: 'ఆప్ట్ అవుట్ 🛑' },
        { id: ID.consentTerms, title: 'వివరాలు' },
      ],
      footer: 'అత్యవసర పరిస్థితులకు 112 కు కాల్ చేయండి',
    };
  }

  if (loc === 'hi') {
    return {
      kind: 'buttons',
      header: 'चरण 1/3: सहमति',
      body:
        "नमस्ते! मैं डेयली (dayli) हूँ — आपके और आपके परिवार की स्वास्थ्य साथी।\n\n" +
        'सटीक मार्गदर्शन के लिए मुझे यह जानना होगा कि मैं किसकी सहायता कर रही हूँ और आपका स्थान क्या है।\n\n' +
        '• आपकी जानकारी पूरी तरह सुरक्षित और निजी है\n' +
        '• आप कभी भी *opt out* या *stop* लिखकर इसे हटा सकते हैं\n' +
        '• मैं डॉक्टर नहीं हूँ, केवल सामान्य स्वास्थ्य मार्गदर्शन देती हूँ\n\n' +
        'क्या हम शुरू करें?',
      buttons: [
        { id: ID.consentYes, title: 'शुरू करें' },
        { id: ID.consentNo, title: 'ऑप्ट आउट 🛑' },
        { id: ID.consentTerms, title: 'नियम जानें' },
      ],
      footer: 'आपात स्थिति में 112 पर कॉल करें',
    };
  }

  if (['ta', 'kn', 'ml', 'mr', 'bn', 'ar', 'fr', 'sw', 'ha', 'yo', 'am', 'zu'].includes(loc)) {
    return {
      kind: 'buttons',
      header: t('consent_header', loc),
      body: t('consent_body', loc),
      buttons: [
        { id: ID.consentYes, title: t('consent_yes', loc) },
        { id: ID.consentNo, title: t('consent_no', loc) },
        { id: ID.consentTerms, title: t('consent_terms', loc) },
      ],
      footer: t('consent_footer', loc),
    };
  }

  return {
    kind: 'buttons',
    header: 'Step 1 of 3: Consent',
    body:
      "Hello! I'm dayli — a health companion for you and your family, with an eye on the weather where you are.\n\n" +
      'Before we start: to give you advice that actually fits, I need to remember a little about you — ' +
      'who I am helping, and roughly where you are.\n\n' +
      '• I keep it private and never sell it\n' +
      '• You can say *opt out* or *stop* at any time and I will delete it\n' +
      "• I'm not a doctor, and I can't diagnose anything\n\n" +
      'Is that OK?',
    buttons: [
      { id: ID.consentYes, title: "Yes, let's start" },
      { id: ID.consentNo, title: 'Opt Out 🛑' },
      { id: ID.consentTerms, title: 'How you use it' },
    ],
    footer: 'For emergencies, call 112',
  };
}

export function consentDetails(locale = 'en') {
  const loc = normalizeLocale(locale);
  if (loc === 'te') {
    return {
      kind: 'text',
      body:
        '*నేను ఏమి నిల్వ చేస్తాను:*\n\n' +
        '• *ఎవరి కోసం* — శిశువు, చిన్న పిల్లలు, గర్భవతి లేదా మీ స్వంత ఆరోగ్యం.\n' +
        '• *మీ లొకేషన్* — మీ ప్రాంతంలో ప్రస్తుత ఉష్ణోగ్రత మరియు గాలి నాణ్యత (AQI) తనిఖీ చేయడానికి.\n' +
        '• *డేటా భద్రత* — మీ డేటా ఎప్పటికీ విక్రయించబడదు.\n\n' +
        'కొనసాగించడానికి *start* అని లేదా తొలగించడానికి *stop* అని పంపండి.',
    };
  }

  if (loc === 'hi') {
    return {
      kind: 'text',
      body:
        '*मैं क्या जानकारी सुरक्षित रखती हूँ:*\n\n' +
        '• *किसके लिए* — शिशु, बच्चे, गर्भावस्था या आपका स्वास्थ्य।\n' +
        '• *स्थान* — आपके क्षेत्र का लाइव तापमान और वायु गुणवत्ता (AQI) जानने के लिए।\n' +
        '• *डेटा गोपनीयता* — आपकी जानकारी कभी बेची नहीं जाती।\n\n' +
        'जारी रखने के लिए *start* लिखें, या हटाने के लिए *stop* लिखें।',
    };
  }

  if (['ta', 'kn', 'ml', 'mr', 'bn', 'ar', 'fr', 'sw', 'ha', 'yo', 'am', 'zu'].includes(loc)) {
    return {
      kind: 'text',
      body: t('consent_terms_body', loc),
    };
  }

  return {
    kind: 'text',
    body:
      '*What I store, and why*\n\n' +
      '• *Who I am helping* — a baby, a child, yourself, or a pregnancy. This decides which safety rules ' +
      'I apply. Advice for an adult can be genuinely unsafe for a baby, so I need this one.\n' +
      '• *Roughly where you are* — to look up today\'s real temperature and air quality. A city is enough; ' +
      'a location pin is more accurate.\n' +
      '• *Our recent messages* — so I can follow the thread. These expire.\n\n' +
      '*What I never do:* sell your data, share it with anyone without asking you first, or send you ads.\n\n' +
      '*What I am not:* a doctor, a diagnosis, or a substitute for one. In an emergency, call *112*.\n\n' +
      'Reply *start* to continue, or *stop* to delete everything.',
  };
}

export function consentDeclined(locale = 'en') {
  const loc = normalizeLocale(locale);
  if (loc === 'te') {
    return {
      kind: 'text',
      body:
        'సరే — ఏ సమాచారమూ నిల్వ చేయబడలేదు.\n\n' +
        'మీరు ఎప్పుడైనా సాధారణ ప్రశ్నలు అడగవచ్చు. మళ్లీ ప్రారంభించాలనుకుంటే *start* అని పంపండి.\n\n' +
        'అత్యవసర సమయాల్లో *112* కు కాల్ చేయండి.',
    };
  }

  if (loc === 'hi') {
    return {
      kind: 'text',
      body:
        'कोई बात नहीं — आपकी कोई जानकारी सहेजी नहीं गई है।\n\n' +
        'आप कभी भी सामान्य प्रश्न पूछ सकते हैं। फिर से शुरू करने के लिए *start* लिखें।\n\n' +
        'आपात स्थिति में *112* पर कॉल करें।',
    };
  }

  if (['ta', 'kn', 'ml', 'mr', 'bn', 'ar', 'fr', 'sw', 'ha', 'yo', 'am', 'zu'].includes(loc)) {
    return {
      kind: 'text',
      body: t('consent_declined_body', loc),
    };
  }

  return {
    kind: 'text',
    body:
      "That's completely fine — nothing has been saved.\n\n" +
      'You can still ask me general health and weather questions any time, I just will not be able to ' +
      'tailor answers to you. If you change your mind, say *start*.\n\n' +
      'If something is urgent, please call *112* or go to your nearest emergency department.',
  };
}

// ── Step 2: who is this for (and, for a child or pregnancy, their age) ───────────────────────────────────────────────

export function subjectPrompt(locale = 'en') {
  const loc = normalizeLocale(locale);
  if (loc === 'te') {
    return {
      kind: 'list',
      header: 'దశ 2/3: ఎవరి కోసం?',
      body: 'మీకు సరిపోయే భద్రతా నియమాలు మరియు సలహాలు అందించడానికి ఎవరికోసం అడుగుతున్నారో ఎంచుకోండి.',
      buttonText: 'ఎంచుకోండి',
      sections: [
        {
          title: 'ఎవరి ఆరోగ్యం',
          rows: [
            { id: `${ID.subjPrefix}infant`, title: 'నా బిడ్డ (శిశువు)', description: '1 సంవత్సరం లోపు' },
            { id: `${ID.subjPrefix}child`, title: 'నా పిల్లలు', description: '1 నుండి 12 సంవత్సరాలు' },
            { id: `${ID.subjPrefix}pregnant`, title: 'నేను గర్భవతిని', description: 'గర్భధారణ సలహాలు' },
            { id: `${ID.subjPrefix}postpartum`, title: 'ఇటీవలే ప్రసవించాను', description: 'ప్రసవానంతర సంరక్షణ' },
            { id: `${ID.subjPrefix}adult`, title: 'నా కోసం', description: 'సాధారణ పెద్దల ఆరోగ్యం' },
            { id: `${ID.subjPrefix}unknown`, title: 'చెప్పదలచుకోలేదు', description: 'అవసరమైనప్పుడు అడుగుతాను' },
          ],
        },
      ],
    };
  }

  if (loc === 'hi') {
    return {
      kind: 'list',
      header: 'चरण 2/3: किसके लिए?',
      body: 'सटीक स्वास्थ्य और सुरक्षा मार्गदर्शन के लिए कृपया चुनें कि आप किसके बारे में पूछ रहे हैं:',
      buttonText: 'चुनें',
      sections: [
        {
          title: 'स्वास्थ्य प्रोफ़ाइल',
          rows: [
            { id: `${ID.subjPrefix}infant`, title: 'मेरा शिशु/बच्चा', description: '1 वर्ष से कम' },
            { id: `${ID.subjPrefix}child`, title: 'मेरा बड़ा बच्चा', description: '1 से 12 वर्ष' },
            { id: `${ID.subjPrefix}pregnant`, title: 'मैं गर्भवती हूँ', description: 'गर्भावस्था मार्गदर्शन' },
            { id: `${ID.subjPrefix}postpartum`, title: 'हाल ही में प्रसव हुआ', description: 'प्रसवोत्तर देखभाल' },
            { id: `${ID.subjPrefix}adult`, title: 'मेरे लिए', description: 'वयस्क स्वास्थ्य' },
            { id: `${ID.subjPrefix}unknown`, title: 'बताना नहीं चाहते', description: 'जरूरत पड़ने पर पूछेंगे' },
          ],
        },
      ],
    };
  }

  if (['ta', 'kn', 'ml', 'mr', 'bn', 'ar', 'fr', 'sw', 'ha', 'yo', 'am', 'zu'].includes(loc)) {
    return {
      kind: 'list',
      header: t('subject_header', loc),
      body: t('subject_body', loc),
      buttonText: t('subject_btn', loc),
      sections: [
        {
          title: t('subject_section', loc),
          rows: [
            { id: `${ID.subjPrefix}infant`, title: t('subj_infant_title', loc), description: t('subj_infant_desc', loc) },
            { id: `${ID.subjPrefix}child`, title: t('subj_child_title', loc), description: t('subj_child_desc', loc) },
            { id: `${ID.subjPrefix}pregnant`, title: t('subj_pregnant_title', loc), description: t('subj_pregnant_desc', loc) },
            { id: `${ID.subjPrefix}postpartum`, title: t('subj_postpartum_title', loc), description: t('subj_postpartum_desc', loc) },
            { id: `${ID.subjPrefix}adult`, title: t('subj_adult_title', loc), description: t('subj_adult_desc', loc) },
            { id: `${ID.subjPrefix}unknown`, title: t('subj_unknown_title', loc), description: t('subj_unknown_desc', loc) },
          ],
        },
      ],
    };
  }

  return {
    kind: 'list',
    header: 'Step 2 of 3: Profile',
    body:
      'This is the one thing I really need, because the safety rules are different for each.\n\n' +
      'Pick whoever you are asking about most often — you can tell me about someone else any time.',
    buttonText: 'Choose',
    sections: [
      {
        title: 'Who this is for',
        rows: [
          { id: `${ID.subjPrefix}infant`, title: 'My baby', description: 'Under 1 year old' },
          { id: `${ID.subjPrefix}child`, title: 'My child', description: '1 to 12 years old' },
          { id: `${ID.subjPrefix}pregnant`, title: "I'm pregnant", description: 'Guidance for pregnancy' },
          { id: `${ID.subjPrefix}postpartum`, title: 'Recently gave birth', description: 'Postpartum and feeding' },
          { id: `${ID.subjPrefix}adult`, title: 'Myself', description: 'General adult health' },
          { id: `${ID.subjPrefix}unknown`, title: 'Rather not say', description: 'I will ask when it matters' },
        ],
      },
    ],
  };
}

export function childAgePrompt(locale = 'en') {
  const loc = normalizeLocale(locale);
  if (loc === 'te') {
    return {
      kind: 'list',
      header: 'దశ 2/3: బిడ్డ వయస్సు',
      body: 'శిశువులకు ఇచ్చే నీరు, ఆహారం మరియు జ్వరం సలహాలు వయస్సుపై ఆధారపడి ఉంటాయి.',
      buttonText: 'వయస్సు ఎంచుకోండి',
      sections: [
        {
          title: 'వయస్సు',
          rows: [
            { id: `${ID.agePrefix}0`, title: '3 నెలల లోపు', description: 'నవజాత శిశువు' },
            { id: `${ID.agePrefix}3`, title: '3 నుండి 6 నెలలు', description: '' },
            { id: `${ID.agePrefix}6`, title: '6 నుండి 12 నెలలు', description: '' },
            { id: `${ID.agePrefix}12`, title: '1 నుండి 2 ఏళ్ళు', description: 'పసిపిల్లలు' },
            { id: `${ID.agePrefix}36`, title: '3 నుండి 5 ఏళ్ళు', description: '' },
            { id: `${ID.agePrefix}72`, title: '6 నుండి 12 ఏళ్ళు', description: '' },
            { id: `${ID.agePrefix}-1`, title: 'చెప్పదలచుకోలేదు', description: '' },
          ],
        },
      ],
    };
  }

  if (loc === 'hi') {
    return {
      kind: 'list',
      header: 'चरण 2/3: बच्चे की आयु',
      body: 'शिशुओं के लिए बुखार और पेय पदार्थों से जुड़े नियम आयु के अनुसार बदलते हैं:',
      buttonText: 'आयु चुनें',
      sections: [
        {
          title: 'आयु वर्ग',
          rows: [
            { id: `${ID.agePrefix}0`, title: '3 महीने से कम', description: 'नवजात' },
            { id: `${ID.agePrefix}3`, title: '3 से 6 महीने', description: '' },
            { id: `${ID.agePrefix}6`, title: '6 से 12 महीने', description: '' },
            { id: `${ID.agePrefix}12`, title: '1 से 2 वर्ष', description: 'टॉडलर' },
            { id: `${ID.agePrefix}36`, title: '3 से 5 वर्ष', description: '' },
            { id: `${ID.agePrefix}72`, title: '6 से 12 वर्ष', description: '' },
            { id: `${ID.agePrefix}-1`, title: 'बताना नहीं चाहते', description: '' },
          ],
        },
      ],
    };
  }

  if (['ta', 'kn', 'ml', 'mr', 'bn', 'ar', 'fr', 'sw', 'ha', 'yo', 'am', 'zu'].includes(loc)) {
    return {
      kind: 'list',
      header: t('age_header', loc),
      body: t('age_body', loc),
      buttonText: t('age_btn', loc),
      sections: [
        {
          title: t('age_btn', loc),
          rows: [
            { id: `${ID.agePrefix}0`, title: t('age_under3m', loc), description: '' },
            { id: `${ID.agePrefix}3`, title: t('age_3to6m', loc), description: '' },
            { id: `${ID.agePrefix}6`, title: t('age_6to12m', loc), description: '' },
            { id: `${ID.agePrefix}12`, title: '1-2 y', description: '' },
            { id: `${ID.agePrefix}36`, title: '3-5 y', description: '' },
            { id: `${ID.agePrefix}72`, title: '6-12 y', description: '' },
            { id: `${ID.agePrefix}-1`, title: t('subj_unknown_title', loc), description: '' },
          ],
        },
      ],
    };
  }

  return {
    kind: 'list',
    header: "Step 2 of 3: Baby's Age",
    body:
      'Age changes the advice more than anything else at this stage — especially around fevers and what is ' +
      'safe to give them to drink.',
    buttonText: 'Choose age',
    sections: [
      {
        title: 'Age',
        rows: [
          { id: `${ID.agePrefix}0`, title: 'Under 3 months', description: 'Newborn' },
          { id: `${ID.agePrefix}3`, title: '3 to 6 months', description: '' },
          { id: `${ID.agePrefix}6`, title: '6 to 12 months', description: '' },
          { id: `${ID.agePrefix}12`, title: '1 to 2 years', description: 'Toddler' },
          { id: `${ID.agePrefix}36`, title: '3 to 5 years', description: '' },
          { id: `${ID.agePrefix}72`, title: '6 to 12 years', description: '' },
          { id: `${ID.agePrefix}-1`, title: 'Rather not say', description: '' },
        ],
      },
    ],
  };
}

export function pregnancyPrompt(locale = 'en') {
  const loc = normalizeLocale(locale);
  if (loc === 'te') {
    return {
      kind: 'list',
      header: 'దశ 2/3: ఏ నెల?',
      body: 'గర్భధారణ దశను బట్టి సరైన జాగ్రత్తలు మరియు లక్షణాలను గమనించవచ్చు.',
      buttonText: 'ఎంచుకోండి',
      sections: [
        {
          title: 'దశ',
          rows: [
            { id: `${ID.pregPrefix}8`, title: 'మొదటి త్రైమాసికం', description: '1 నుండి 13 వారాలు' },
            { id: `${ID.pregPrefix}20`, title: 'రెండవ త్రైమాసికం', description: '14 నుండి 27 వారాలు' },
            { id: `${ID.pregPrefix}32`, title: 'మూడవ త్రైమాసికం', description: '28+ వారాలు' },
            { id: `${ID.pregPrefix}-1`, title: 'ఖచ్చితంగా తెలియదు', description: '' },
          ],
        },
      ],
    };
  }

  if (loc === 'hi') {
    return {
      kind: 'list',
      header: 'चरण 2/3: तिमाही',
      body: 'गर्भावस्था की अवधि के अनुसार आवश्यक सावधानियों का ध्यान रखा जाएगा:',
      buttonText: 'चुनें',
      sections: [
        {
          title: 'गर्भावस्था चरण',
          rows: [
            { id: `${ID.pregPrefix}8`, title: 'पहली तिमाही', description: 'सप्ताह 1 से 13' },
            { id: `${ID.pregPrefix}20`, title: 'दूसरी तिमाही', description: 'सप्ताह 14 से 27' },
            { id: `${ID.pregPrefix}32`, title: 'तीसरी तिमाही', description: 'सप्ताह 28 और आगे' },
            { id: `${ID.pregPrefix}-1`, title: 'पक्का नहीं पता', description: '' },
          ],
        },
      ],
    };
  }

  if (['ta', 'kn', 'ml', 'mr', 'bn', 'ar', 'fr', 'sw', 'ha', 'yo', 'am', 'zu'].includes(loc)) {
    return {
      kind: 'list',
      header: t('preg_header', loc),
      body: t('preg_body', loc),
      buttonText: t('preg_btn', loc),
      sections: [
        {
          title: t('preg_btn', loc),
          rows: [
            { id: `${ID.pregPrefix}8`, title: t('preg_tri1', loc), description: '' },
            { id: `${ID.pregPrefix}20`, title: t('preg_tri2', loc), description: '' },
            { id: `${ID.pregPrefix}32`, title: t('preg_tri3', loc), description: '' },
            { id: `${ID.pregPrefix}-1`, title: t('subj_unknown_title', loc), description: '' },
          ],
        },
      ],
    };
  }

  return {
    kind: 'list',
    header: 'Step 2 of 3: Stage',
    body: 'Roughly is fine. Some warning signs only apply later in pregnancy, so this helps me know what to watch for.',
    buttonText: 'Choose stage',
    sections: [
      {
        title: 'Stage',
        rows: [
          { id: `${ID.pregPrefix}8`, title: 'First trimester', description: 'Weeks 1 to 13' },
          { id: `${ID.pregPrefix}20`, title: 'Second trimester', description: 'Weeks 14 to 27' },
          { id: `${ID.pregPrefix}32`, title: 'Third trimester', description: 'Week 28 onwards' },
          { id: `${ID.pregPrefix}-1`, title: 'Not sure', description: '' },
        ],
      },
    ],
  };
}

// ── Step 3: location ──────────────────────────────────────────────────────

export function locationPrompt(locale = 'en') {
  const loc = normalizeLocale(locale);
  if (loc === 'te') {
    return {
      kind: 'location_request',
      body:
        'దశ 3/3: మీ ప్రాంతం\n\n' +
        'చివరిగా — మీరు ఎక్కడ ఉన్నారు?\n\n' +
        'మీ ప్రాంతంలోని ఉష్ణోగ్రత, ఎండ తీవ్రత మరియు గాలి నాణ్యతను పరిశీలించి సరైన సలహాలు ఇవ్వడానికి ఇది ఉపయోగపడుతుంది.\n\n' +
        'క్రింద ఉన్న బటన్ నొక్కి లొకేషన్ పంపండి లేదా మీ ఊరి పేరును టైప్ చేయండి.',
    };
  }

  if (loc === 'hi') {
    return {
      kind: 'location_request',
      body:
        'चरण 3/3: आपका स्थान\n\n' +
        'आखिरी चरण — आप कहाँ स्थित हैं?\n\n' +
        'आपके शहर के वास्तविक तापमान, गर्मी और वायु गुणवत्ता (AQI) के अनुसार अनुकूलित स्वास्थ्य सलाह के लिए यह उपयोगी है।\n\n' +
        'नीचे दिए गए बटन से लोकेशन साझा करें या अपने शहर का नाम टाइप करें।',
    };
  }

  if (['ta', 'kn', 'ml', 'mr', 'bn', 'ar', 'fr', 'sw', 'ha', 'yo', 'am', 'zu'].includes(loc)) {
    return {
      kind: 'location_request',
      body: `${t('loc_header', loc)}\n\n${t('loc_body', loc)}`,
    };
  }

  return {
    kind: 'location_request',
    body:
      'Step 3 of 3: Location\n\n' +
      'Last thing — where are you?\n\n' +
      "I use this to check today's real temperature, humidity and air quality where you actually are, " +
      'so the advice matches your day rather than a national average.\n\n' +
      'Tap below to share your location, or just type your city name. You can skip this too.',
  };
}

// ── Reply interpretation ──────────────────────────────────────────────────

const AFFIRMATIVE = [
  'start', 'yes', 'ok', 'okay', 'begin',
  'हाँ', 'हां', 'शुरू',
  'అవును', 'ప్రారంభించు',
  'ஆம்', 'சரி', 'தொடங்கு',
  'ಹೌದು', 'ಸರಿ', 'ಪ್ರಾರಂಭಿಸು',
  'അതെ', 'ശരി', 'തുടങ്ങുക',
  'होय', 'सुरू करा', 'ठीक आहे',
  'হ্যাঁ', 'শুরু করুন', 'ঠিক আছে',
];

const STOP_WORDS = [
  'stop',
  'opt out',
  'opt-out',
  'optout',
  'delete',
  'delete my data',
  'delete data',
  'unsubscribe',
  'forget me',
  'erase',
  'erase my data',
  'remove me',
  'cancel',
  'exit',
  'quit',
  'बंद',
  'हटाओ',
  'रद्द',
  'छोड़ें',
  'ఆపు',
  'తొలగించు',
  'వద్దు',
  'రద్దు',
  'நிறுத்து',
  'விலகு',
  'நீக்கு',
  'அழி',
  'ನಿಲ್ಲಿಸು',
  'ತೆಗೆದುಹಾಕು',
  'നിർത്തുക',
  'ഒഴിവാക്കുക',
  'ഡിലീറ്റ്',
  'थांबवा',
  'हटवा',
  'नको',
  'থামুন',
  'মুছে ফেলুন',
  'বাতিল',
];

const SKIP_WORDS = [
  'skip', 'later', 'no', 'not now',
  'దాటవేయి', 'వద్దు',
  'छोड़ें', 'नहीं', 'बाद में',
  'தவிர்', 'வேண்டாம்',
  'ಬಿಟ್ಟುಬಿಡು', 'ಬೇಡ',
  'ഒഴിവാക്കുക', 'വേണ്ട',
  'वगळा', 'नको',
  'এড়িয়ে যান', 'পরে',
];

/**
 * Did the user decline to give a location, rather than name a place?
 * Without this, "skip" would be geocoded and could match a real town.
 */
export function isSkipRequest(text) {
  const t = String(text || '').trim().toLowerCase();
  return SKIP_WORDS.some((w) => t === w);
}

const GREETINGS = [
  'hi', 'hii', 'hiii', 'hey', 'heyy', 'hello', 'helo', 'hlo', 'hi there',
  'good morning', 'good afternoon', 'good evening', 'namaste', 'namaskaram',
  'హాయ్', 'హలో', 'నమస్కారం', 'నమస్తే',
  'हाय', 'हैलो', 'नमस्ते', 'नमस्कार',
  'வணக்கம்', 'ஹலோ',
  'ನಮಸ್ಕಾರ', 'ಹಲೋ',
  'നമസ്കാരം', 'ഹലോ',
  'नमस्कार', 'हॅलो',
  'নমস্কার', 'হ্যালো',
];

/**
 * Is this message *only* a greeting?
 */
export function isGreeting(text) {
  const t = String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[!.,?]+$/, '');
  return GREETINGS.includes(t);
}

/**
 * A short hello that re-opens the conversation instead of continuing the last
 * one, and reminds them what dayli is for.
 */
export function greetingReply(session) {
  const p = session.profile || {};
  const locale = normalizeLocale(p.locale || 'en');
  const name = p.name ? `, ${p.name.split(' ')[0]}` : '';

  if (locale === 'te') {
    return {
      kind: 'text',
      body:
        `నమస్కారం${name}! 🌸 నేను ఇక్కడే ఉన్నాను.\n\n` +
        'మీరు ఇలా అడగవచ్చు:\n' +
        '• "నా బిడ్డకు జ్వరం వచ్చింది, ఏమి చేయాలి?"\n' +
        '• "ఈరోజు వాతావరణం ఎలా ఉంది?"\n' +
        '• "దగ్గరలో ఆసుపత్రి ఎక్కడ ఉంది?"',
    };
  }
  if (locale === 'hi') {
    return {
      kind: 'text',
      body:
        `नमस्ते${name}! 🌸 मैं यहीं हूँ।\n\n` +
        'आप ऐसे पूछ सकते हैं:\n' +
        '• "मेरे बच्चे को बुखार है, क्या करूँ?"\n' +
        '• "आज मौसम कैसा है?"\n' +
        '• "नज़दीकी अस्पताल कहाँ है?"',
    };
  }
  if (locale === 'ta') {
    return {
      kind: 'text',
      body:
        `வணக்கம்${name}! 🌸 நான் இங்கே உள்ளேன்.\n\n` +
        'நீங்கள் என்னிடம் கேட்கலாம்:\n' +
        '• "என் குழந்தைக்கு காய்ச்சல், என்ன செய்வது?"\n' +
        '• "இன்று வானிலை எப்படி உள்ளது?"\n' +
        '• "அருகில் உள்ள மருத்துவமனை எங்குள்ளது?"',
    };
  }
  if (locale === 'kn') {
    return {
      kind: 'text',
      body:
        `ನಮಸ್ಕಾರ${name}! 🌸 ನಾನು ಇಲ್ಲಿದ್ದೇನೆ.\n\n` +
        'ನೀವು ಹೀಗೆ ಕೇಳಬಹುದು:\n' +
        '• "ನನ್ನ ಮಗುವಿಗೆ ಜ್ವರ ಬಂದಿದೆ, ಏನು ಮಾಡಬೇಕು?"\n' +
        '• "ಇಂದಿನ ಹವಾಮಾನ ಹೇಗಿದೆ?"\n' +
        '• "ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆ ಎಲ್ಲಿದೆ?"',
    };
  }
  if (locale === 'ml') {
    return {
      kind: 'text',
      body:
        `നമസ്കാരം${name}! 🌸 ഞാൻ ഇവിടെയുണ്ട്.\n\n` +
        'നിങ്ങൾക്ക് ചോദിക്കാം:\n' +
        '• "കുഞ്ഞിന് പനിയുണ്ട്, ഞാൻ എന്ത് ചെയ്യണം?"\n' +
        '• "ഇന്നത്തെ കാലാവസ്ഥ എങ്ങനെയുണ്ട്?"\n' +
        '• "അടുത്തുള്ള ആശുപത്രി എവിടെയാണ്?"',
    };
  }
  if (locale === 'mr') {
    return {
      kind: 'text',
      body:
        `नमस्कार${name}! 🌸 मी इथेच आहे.\n\n` +
        'तुम्ही मला विचारू शकता:\n' +
        '• "माझ्या बाळाला ताप आहे, मी काय करू?"\n' +
        '• "आजचे हवामान कसे आहे?"\n' +
        '• "जवळचे रुग्णालय कुठे आहे?"',
    };
  }
  if (locale === 'bn') {
    return {
      kind: 'text',
      body:
        `নমস্কার${name}! 🌸 আমি আছি।\n\n` +
        'আপনি আমাকে জিজ্ঞাসা করতে পারেন:\n' +
        '• "আমার শিশুর জ্বর এসেছে, কী করব?"\n' +
        '• "আজকের আবহাওয়া কেমন?"\n' +
        '• "কাছের হাসপাতাল কোথায়?"',
    };
  }

  if (locale === 'ar') {
    return {
      kind: 'text',
      body:
        `مرحبًا${name}! 🌸 أنا هنا لمساعدتك.\n\n` +
        'يمكنك سؤالي عن أشياء مثل:\n' +
        '• "طفلي يعاني من الحمى، ماذا أفعل؟"\n' +
        '• "كيف هو الطقس اليوم؟"\n' +
        '• "أين أقرب مستشفى إليّ؟"',
    };
  }

  if (locale === 'fr') {
    return {
      kind: 'text',
      body:
        `Bonjour${name} ! 🌸 Je suis là pour vous aider.\n\n` +
        'Vous pouvez me demander :\n' +
        '• « Mon bébé a de la fièvre, que faire ? »\n' +
        '• « Quel temps fait-il aujourd\'hui ? »\n' +
        '• « Où est l\'hôpital le plus proche ? »',
    };
  }

  if (locale === 'sw') {
    return {
      kind: 'text',
      body:
        `Hujambo${name}! 🌸 Nipo hapa kukusaidia.\n\n` +
        'Unaweza kuniuliza mambo kama:\n' +
        '• "Mtoto wangu ana homa, nifanye nini?"\n' +
        '• "Hali ya hewa ikoje leo?"\n' +
        '• "Wapi hospitali ya karibu?"',
    };
  }

  if (locale === 'ha') {
    return {
      kind: 'text',
      body:
        `Sannu${name}! 🌸 Ina nan don taimaka muku.\n\n` +
        'Kuna iya tambayata abubuwa kamar:\n' +
        '• "Jaririna na zazzabi, me ya kamata in yi?"\n' +
        '• "Yaya yanayi yake a yau?"\n' +
        '• "Ina asibiti mafi kusa?"',
    };
  }

  if (locale === 'yo') {
    return {
      kind: 'text',
      body:
        `Pẹlẹ o${name}! 🌸 Mo wa nibi lati ran ọ lọwọ.\n\n` +
        'O le bi mi ni awọn ibeere bii:\n' +
        '• "Ọmọ mi ni ibà, kí ni kí n ṣe?"\n' +
        '• "Báwo ni ojú ọjọ́ ṣe rí lónìí?"\n' +
        '• "Níbo ni ilé-ìwòsàn tí ó súnmọ́ jùlọ wà?"',
    };
  }

  if (locale === 'am') {
    return {
      kind: 'text',
      body:
        `ሰላም${name}! 🌸 እርስዎን ለመርዳት እዚህ አለሁ።\n\n` +
        'እንደነዚህ ያሉ ጥያቄዎችን መጠየቅ ይችላሉ፡\n' +
        '• "ልጄ ትኩሳት አለበት፣ ምን ማድረግ አለብኝ?"\n' +
        '• "የዛሬው የአየር ሁኔታ ምን ይመስላል?"\n' +
        '• "በአቅራቢያዬ ሆስፒታል የየት አለ?"',
    };
  }

  if (locale === 'zu') {
    return {
      kind: 'text',
      body:
        `Sawubona${name}! 🌸 Ngilapha ukukusiza.\n\n` +
        'Ungangibuza izinto ezinjengalezi:\n' +
        '• "Ingane yami inomkhuhlane, kumele ngenzeni?"\n' +
        '• "Linjani izulu namhlanje?"\n' +
        '• "Ikuphi isibhedlela esiseduze?"',
    };
  }

  return {
    kind: 'text',
    body:
      `Hello${name}! 🌸 I'm here.\n\n` +
      'You can ask me things like:\n' +
      '• "My baby has a fever, what should I do?"\n' +
      '• "What\'s the weather like today?"\n' +
      '• "Where is the nearest hospital?"',
  };
}

export function isStopRequest(text, replyId = null) {
  if (
    replyId &&
    (replyId === ID.optOut ||
      replyId === ID.consentNo ||
      replyId === 'opt_out' ||
      replyId === 'ob_opt_out' ||
      replyId === 'ob_consent_no')
  ) {
    return true;
  }
  const t = String(text || '').trim().toLowerCase();
  if (!t) return false;

  // Never treat clinical symptom queries or negations/continuations as an opt-out
  if (
    /\b(non[-\s]*stop|won'?t\s+stop|doesn'?t\s+stop|does\s+not\s+stop|can'?t\s+stop|cannot\s+stop|never\s+stop|not\s+stop|make\s+(?:it|them)\s+stop|how\s+to\s+stop)\b/i.test(
      t
    )
  ) {
    return false;
  }
  if (
    /\b(baby|child|infant|kid|newborn|fever|cough|coughing|cry|crying|bleed|bleeding|vomit|vomiting|pain|ache|milk|feed|stool|poop|diarrhea|rash|breath|breathing)\b/i.test(
      t
    )
  ) {
    return false;
  }

  // Exact command match or punctuation like "stop.", "stop!"
  const clean = t.replace(/^[!.,\s]+|[!.,\s]+$/g, '');
  if (STOP_WORDS.some((w) => clean === w)) {
    return true;
  }

  // Short explicit opt-out phrases (e.g. "please stop", "stop please", "stop bot", "stop service", "stop messages")
  if (/^(?:please\s+stop|stop\s+please|stop\s+(?:it|bot|messages?|service|chat|all))$/i.test(clean)) {
    return true;
  }

  // Explicit GDPR / data deletion / unsubscribe keywords
  if (/\b(opt\s*[-_]?\s*out|unsubscribe|forget\s+me|delete(?:\s+my)?\s+data|erase(?:\s+my)?\s+data)\b/i.test(clean)) {
    return true;
  }
  return false;
}

export function isStartRequest(text) {
  const t = String(text || '').trim().toLowerCase();
  return AFFIRMATIVE.some((w) => t === w);
}

/**
 * Advance onboarding given the user's reply.
 *
 * @returns {{ session: object, reply: object|null, complete: boolean }}
 */
export function advance(session, event) {
  const replyId = event.replyId || '';
  const text = String(event.text || '').trim();

  const isAwaitingLang =
    Boolean(session.awaitingLanguageSelection) ||
    !session.onboardingStep ||
    session.onboardingStep === STEPS.LANGUAGE ||
    !session.profile?.languageSelected;

  // Explicit language menu selection or text language choice
  const langChoice = parseLanguageSelection(replyId, text, {
    allowNumeric: isAwaitingLang,
  });
  if (langChoice === 'more') {
    return { session, reply: getLanguageMenu(session.profile?.locale || 'en', 'more'), complete: false };
  }
  if (langChoice === 'back') {
    return { session, reply: getLanguageMenu(session.profile?.locale || 'en', 'main'), complete: false };
  }
  if (langChoice) {
    session.profile.locale = langChoice;
    session.profile.languageSelected = true;
    delete session.awaitingLanguageSelection;
    const msg = getLanguageSwitchedMessage(langChoice);
    if (!session.onboardingStep || session.onboardingStep === STEPS.LANGUAGE) {
      session.onboardingStep = STEPS.CONSENT;
      return {
        session,
        reply: consentPrompt(langChoice),
        prefixMessage: msg,
        complete: false,
      };
    }
    let promptReply = null;
    if (session.onboardingStep === STEPS.CONSENT) promptReply = consentPrompt(langChoice);
    else if (session.onboardingStep === STEPS.SUBJECT) promptReply = subjectPrompt(langChoice);
    else if (session.onboardingStep === STEPS.CHILD_AGE) promptReply = childAgePrompt(langChoice);
    else if (session.onboardingStep === STEPS.PREGNANCY_STAGE) promptReply = pregnancyPrompt(langChoice);
    else if (session.onboardingStep === STEPS.LOCATION) promptReply = locationPrompt(langChoice);

    return {
      session,
      reply: promptReply || { kind: 'text', body: msg },
      prefixMessage: promptReply ? msg : null,
      complete: false,
    };
  }

  // Language command ('LANGUAGE', 'భాష', etc.)
  if (isLanguageCommand(text)) {
    session.awaitingLanguageSelection = true;
    return {
      session,
      reply: getLanguageMenu(session.profile?.locale || 'en'),
      complete: false,
    };
  }

  const step = session.onboardingStep;

  // ── Language (Pre-Onboarding Step) ──────────────────────────────────────
  // If the user has not explicitly selected a language yet, or is at the LANGUAGE step
  if (step === STEPS.LANGUAGE || (!step && !session.profile?.languageSelected)) {
    session.onboardingStep = STEPS.LANGUAGE;
    return {
      session,
      reply: languagePrompt(session.profile?.locale || 'en'),
      complete: false,
    };
  }

  const detected = detectLocale(text);
  if (!session.profile?.languageSelected && (detected !== 'en' || !session.profile?.locale)) {
    session.profile.locale = detected;
  }
  const locale = session.profile?.locale || 'en';

  // ── Consent ─────────────────────────────────────────────────────────────
  if (step === STEPS.CONSENT || !step) {
    if (replyId === ID.consentTerms) {
      return { session, reply: consentDetails(locale), complete: false };
    }
    if (replyId === ID.optOut) {
      session.onboardingStep = null;
      session.consent = { granted: false, grantedAt: null, version: CONSENT_VERSION, declinedAt: Date.now() };
      metric('consent.declined');
      metric('user.opt_out');
      return { session, reply: stopConfirmation(locale), complete: true, optedOut: true };
    }
    if (replyId === ID.consentNo) {
      session.onboardingStep = null;
      session.consent = { granted: false, grantedAt: null, version: CONSENT_VERSION, declinedAt: Date.now() };
      metric('consent.declined');
      metric('user.opt_out');
      return { session, reply: consentDeclined(locale), complete: true, optedOut: true };
    }
    if (replyId === ID.consentYes || isStartRequest(text)) {
      session.consent = { granted: true, grantedAt: Date.now(), version: CONSENT_VERSION };
      metric('consent.granted');
      session.onboardingStep = STEPS.SUBJECT;
      return { session, reply: subjectPrompt(locale), complete: false };
    }
    // Anything else at this stage: re-ask once, without nagging.
    session.onboardingStep = STEPS.CONSENT;
    return { session, reply: consentPrompt(locale), complete: false };
  }

  // ── Subject ─────────────────────────────────────────────────────────────
  if (step === STEPS.SUBJECT) {
    if (replyId.startsWith(ID.subjPrefix)) {
      const choice = replyId.slice(ID.subjPrefix.length);
      const map = {
        infant: 'infant',
        child: 'child',
        pregnant: 'pregnant_person',
        postpartum: 'postpartum_person',
        adult: 'adult',
        unknown: 'unknown',
      };
      session.profile.subjectType = map[choice] || 'unknown';

      if (choice === 'infant' || choice === 'child') {
        session.onboardingStep = STEPS.CHILD_AGE;
        return { session, reply: childAgePrompt(locale), complete: false };
      }
      if (choice === 'pregnant') {
        session.onboardingStep = STEPS.PREGNANCY_STAGE;
        return { session, reply: pregnancyPrompt(locale), complete: false };
      }
      session.onboardingStep = STEPS.LOCATION;
      return { session, reply: locationPrompt(locale), complete: false };
    }
    const tTrim = text.trim();
    if (tTrim === '1' || /infant|baby|குழந்தை|శిశువు|शिशु/i.test(tTrim)) {
      session.profile.subjectType = 'infant';
      session.onboardingStep = STEPS.CHILD_AGE;
      return { session, reply: childAgePrompt(locale), complete: false };
    }
    if (tTrim === '2' || /pregnant|pregnancy|கர்ப்பம்|கர்ப்பமாக|గర్భవతి|गर्भावस्था|गर्भवती/i.test(tTrim)) {
      session.profile.subjectType = 'pregnant_person';
      session.onboardingStep = STEPS.PREGNANCY_STAGE;
      return { session, reply: pregnancyPrompt(locale), complete: false };
    }
    if (tTrim === '3' || /adult|myself|எனக்கு|నా కోసం|खुद/i.test(tTrim)) {
      session.profile.subjectType = 'adult';
      session.onboardingStep = STEPS.LOCATION;
      return { session, reply: locationPrompt(locale), complete: false };
    }
    return { session, reply: subjectPrompt(locale), complete: false };
  }

  // ── Child age ───────────────────────────────────────────────────────────
  if (step === STEPS.CHILD_AGE) {
    if (replyId.startsWith(ID.agePrefix)) {
      const months = parseInt(replyId.slice(ID.agePrefix.length), 10);
      session.profile.childAgeMonths = months >= 0 ? months : null;
      // Keep the subject honest against the age actually given.
      if (months >= 12) session.profile.subjectType = 'child';
      else if (months >= 0) session.profile.subjectType = 'infant';
      session.onboardingStep = STEPS.LOCATION;
      return { session, reply: locationPrompt(locale), complete: false };
    }
    const tTrim = text.trim();
    if (tTrim === '1') {
      session.profile.childAgeMonths = 3;
      session.profile.subjectType = 'infant';
      session.onboardingStep = STEPS.LOCATION;
      return { session, reply: locationPrompt(locale), complete: false };
    }
    if (tTrim === '2') {
      session.profile.childAgeMonths = 9;
      session.profile.subjectType = 'infant';
      session.onboardingStep = STEPS.LOCATION;
      return { session, reply: locationPrompt(locale), complete: false };
    }
    if (tTrim === '3') {
      session.profile.childAgeMonths = 18;
      session.profile.subjectType = 'child';
      session.onboardingStep = STEPS.LOCATION;
      return { session, reply: locationPrompt(locale), complete: false };
    }
    return { session, reply: childAgePrompt(locale), complete: false };
  }

  // ── Pregnancy stage ─────────────────────────────────────────────────────
  if (step === STEPS.PREGNANCY_STAGE) {
    if (replyId.startsWith(ID.pregPrefix)) {
      const weeks = parseInt(replyId.slice(ID.pregPrefix.length), 10);
      session.profile.pregnancyWeeks = weeks >= 0 ? weeks : null;
      session.onboardingStep = STEPS.LOCATION;
      return { session, reply: locationPrompt(locale), complete: false };
    }
    const tTrim = text.trim();
    if (tTrim === '1' || /first|1st|1வது|முதல்|पहला|మొదటి/i.test(tTrim)) {
      session.profile.pregnancyWeeks = 8;
      session.onboardingStep = STEPS.LOCATION;
      return { session, reply: locationPrompt(locale), complete: false };
    }
    if (tTrim === '2' || /second|2nd|2வது|இரண்டாவது|दूसरा|రెండవ/i.test(tTrim)) {
      session.profile.pregnancyWeeks = 20;
      session.onboardingStep = STEPS.LOCATION;
      return { session, reply: locationPrompt(locale), complete: false };
    }
    if (tTrim === '3' || /third|3rd|3வது|மூன்றாவது|तीसरा|మూడవ/i.test(tTrim)) {
      session.profile.pregnancyWeeks = 32;
      session.onboardingStep = STEPS.LOCATION;
      return { session, reply: locationPrompt(locale), complete: false };
    }
    return { session, reply: pregnancyPrompt(locale), complete: false };
  }

  // ── Location ────────────────────────────────────────────────────────────
  if (step === STEPS.LOCATION) {
    if (event.location?.latitude != null) {
      session.profile.location = {
        latitude: event.location.latitude,
        longitude: event.location.longitude,
        name: event.location.name || event.location.address || null,
        source: 'pin',
      };
      session.onboardingStep = STEPS.DONE;
      return { session, reply: completionMessage(session), complete: true };
    }
    // A typed city is handled by the caller (it needs geocoding); anything
    // else finishes onboarding rather than trapping the user in a loop.
    session.onboardingStep = STEPS.DONE;
    return { session, reply: null, complete: true };
  }

  return { session, reply: null, complete: true };
}

export function completionMessage(session) {
  const p = session.profile;
  const locale = normalizeLocale(p.locale || 'en');

  if (locale === 'te') {
    const who =
      p.subjectType === 'infant'
        ? 'మీ శిశువు'
        : p.subjectType === 'child'
        ? 'మీ పిల్లలు'
        : p.subjectType === 'pregnant_person'
        ? 'మీ గర్భధారణ'
        : 'మీ ఆరోగ్యం';
    const where = p.location?.name ? ` (${p.location.name})` : '';

    return {
      kind: 'text',
      body:
        `అంతా సిద్ధమైంది! ${who}${where} గురించి సలహాలు సిద్ధంగా ఉన్నాయి. 🌸\n\n` +
        'మీరు నన్ను ఇలాంటి విషయాలు అడగవచ్చు:\n' +
        '• "నా బిడ్డకు జ్వరం వచ్చింది, ఏమి చేయాలి?"\n' +
        '• "ఈరోజు ఎండలో బయటకు వెళ్లవచ్చా?"\n' +
        '• "నా దగ్గరలోని ఆసుపత్రులు ఎక్కడ ఉన్నాయి?"\n\n' +
        'సమాచారం తొలగించడానికి ఎప్పుడైనా *stop* అని పంపండి.\n\n' +
        '_ఇది సాధారణ ఆరోగ్య సలహా మాత్రమే. అత్యవసర సమయాల్లో 112 కు కాల్ చేయండి._',
    };
  }

  if (locale === 'hi') {
    const who =
      p.subjectType === 'infant'
        ? 'आपके शिशु'
        : p.subjectType === 'child'
        ? 'आपके बच्चे'
        : p.subjectType === 'pregnant_person'
        ? 'आपकी गर्भावस्था'
        : 'आपके स्वास्थ्य';
    const where = p.location?.name ? ` (${p.location.name})` : '';

    return {
      kind: 'text',
      body:
        `सब तैयार है! मैं ${who}${where} का पूरा ध्यान रखूँगी। 🌸\n\n` +
        'आप मुझसे इस तरह के प्रश्न पूछ सकते हैं:\n' +
        '• "मेरे बच्चे को बुखार है, क्या करूँ?"\n' +
        '• "क्या आज दोपहर बाहर जाना सुरक्षित है?"\n' +
        '• "निकटतम अस्पताल कहाँ है?"\n\n' +
        'जानकारी हटाने के लिए कभी भी *stop* लिखें।\n\n' +
        '_यह केवल सामान्य स्वास्थ्य मार्गदर्शन है। आपात स्थिति में 112 पर कॉल करें._',
    };
  }

  if (locale === 'ta') {
    const who =
      p.subjectType === 'infant'
        ? 'உங்கள் குழந்தை'
        : p.subjectType === 'child'
        ? 'உங்கள் பிள்ளை'
        : p.subjectType === 'pregnant_person'
        ? 'உங்கள் கர்ப்பம்'
        : 'உங்கள் நலம்';
    const where = p.location?.name ? ` (${p.location.name})` : '';

    return {
      kind: 'text',
      body:
        `அனைத்தும் தயாராக உள்ளது! ${who}${where} பற்றிய ஆலோசனைகள் தயாராக உள்ளன. 🌸\n\n` +
        'நீங்கள் என்னிடம் கேட்கலாம்:\n' +
        '• "என் குழந்தைக்கு காய்ச்சல், என்ன செய்வது?"\n' +
        '• "இன்று வெயிலில் வெளியே செல்லலாமா?"\n' +
        '• "அருகில் உள்ள மகப்பேறு மருத்துவமனை எங்கே உள்ளது?"\n\n' +
        'விவரங்களை அழிக்க எப்போது வேண்டுமானாலும் *stop* என அனுப்பவும்.\n\n' +
        '_இது பொதுவான சுகாதார வழிகாட்டல் மட்டுமே. அவசரநிலைக்கு 112 ஐ அழைக்கவும்._',
    };
  }

  if (locale === 'kn') {
    const who =
      p.subjectType === 'infant'
        ? 'ನಿಮ್ಮ ಮಗು'
        : p.subjectType === 'child'
        ? 'ನಿಮ್ಮ ಮಕ್ಕಳು'
        : p.subjectType === 'pregnant_person'
        ? 'ನಿಮ್ಮ ಗರ್ಭಧಾರಣೆ'
        : 'ನಿಮ್ಮ ಆರೋಗ್ಯ';
    const where = p.location?.name ? ` (${p.location.name})` : '';

    return {
      kind: 'text',
      body:
        `ಎಲ್ಲವೂ ಸಿದ್ಧವಾಗಿದೆ! ${who}${where} ಬಗ್ಗೆ ಮಾರ್ಗದರ್ಶನ ನೀಡಲು ನಾನು ಸಿದ್ಧ. 🌸\n\n` +
        'ನೀವು ಹೀಗೆ ಕೇಳಬಹುದು:\n' +
        '• "ನನ್ನ ಮಗುವಿಗೆ ಜ್ವರ ಬಂದಿದೆ, ಏನು ಮಾಡಬೇಕು?"\n' +
        '• "ಇಂದು ಬಿಸಿಲಿನಲ್ಲಿ ಹೊರಗೆ ಹೋಗುವುದು ಸುರಕ್ಷಿತವೇ?"\n' +
        '• "ಹತ್ತಿರದ ಹೆರಿಗೆ ಆಸ್ಪತ್ರೆ ಎಲ್ಲಿದೆ?"\n\n' +
        'ವಿವರಗಳನ್ನು ಅಳಿಸಲು ಯಾವುದೇ ಸಮಯದಲ್ಲಿ *stop* ಎಂದು ಕಳುಹಿಸಿ.\n\n' +
        '_ಇದು ಸಾಮಾನ್ಯ ಆರೋಗ್ಯ ಮಾರ್ಗದರ್ಶನ ಮಾತ್ರ. ತುರ್ತು ಸಂದರ್ಭದಲ್ಲಿ 112 ಗೆ ಕರೆ ಮಾಡಿ._',
    };
  }

  if (locale === 'ml') {
    const who =
      p.subjectType === 'infant'
        ? 'നിങ്ങളുടെ കുഞ്ഞ്'
        : p.subjectType === 'child'
        ? 'നിങ്ങളുടെ കുട്ടി'
        : p.subjectType === 'pregnant_person'
        ? 'നിങ്ങളുടെ ഗർഭധാരണം'
        : 'നിങ്ങളുടെ ആരോഗ്യം';
    const where = p.location?.name ? ` (${p.location.name})` : '';

    return {
      kind: 'text',
      body:
        `എല്ലാം സജ്ജമായി! ${who}${where} സംബന്ധിച്ച ആരോഗ്യ വിവരങ്ങൾ നൽകാൻ ഞാൻ തയ്യാറാണ്. 🌸\n\n` +
        'നിങ്ങൾക്ക് ചോദിക്കാം:\n' +
        '• "കുഞ്ഞിന് പനിയുണ്ട്, ഞാൻ എന്ത് ചെയ്യണം?"\n' +
        '• "ഇന്ന് പുറത്തിറങ്ങുന്നത് സുരക്ഷിതമാണോ?"\n' +
        '• "അടുത്തുള്ള പ്രസവാശുപത്രി എവിടെയാണ്?"\n\n' +
        'വിവരങ്ങൾ നീക്കം ചെയ്യാൻ എപ്പോൾ വേണമെങ്കിലും *stop* എന്ന് അയക്കുക.\n\n' +
        '_ഇത് പൊതു ആരോഗ്യ നിർദ്ദേശങ്ങൾ മാത്രമാണ്. അത്യാഹിതങ്ങൾക്ക് 112 വിളിക്കുക._',
    };
  }

  if (locale === 'mr') {
    const who =
      p.subjectType === 'infant'
        ? 'तुमचे बाळ'
        : p.subjectType === 'child'
        ? 'तुमची मुले'
        : p.subjectType === 'pregnant_person'
        ? 'तुमची गर्भधारणा'
        : 'तुमचे आरोग्य';
    const where = p.location?.name ? ` (${p.location.name})` : '';

    return {
      kind: 'text',
      body:
        `सर्व काही सज्ज आहे! मी ${who}${where} ची काळजी घेईन. 🌸\n\n` +
        'तुम्ही मला विचारू शकता:\n' +
        '• "माझ्या बाळाला ताप आहे, काय करावे?"\n' +
        '• "आज उन्हात बाहेर जाणे सुरक्षित आहे का?"\n' +
        '• "जवळचे रुग्णालय कुठे आहे?"\n\n' +
        'माहिती हटवण्यासाठी कधीही *stop* पाठवा.\n\n' +
        '_हे केवळ सामान्य आरोग्य मार्गदर्शन आहे. आपत्कालीन परिस्थितीत 112 वर कॉल करा._',
    };
  }

  if (locale === 'bn') {
    const who =
      p.subjectType === 'infant'
        ? 'আপনার শিশু'
        : p.subjectType === 'child'
        ? 'আপনার সন্তান'
        : p.subjectType === 'pregnant_person'
        ? 'আপনার গর্ভাবস্থা'
        : 'আপনার স্বাস্থ্য';
    const where = p.location?.name ? ` (${p.location.name})` : '';

    return {
      kind: 'text',
      body:
        `সব প্রস্তুত! আমি ${who}${where} খেয়াল রাখব। 🌸\n\n` +
        'আপনি আমাকে জিজ্ঞাসা করতে পারেন:\n' +
        '• "আমার শিশুর জ্বর হয়েছে, কী করব?"\n' +
        '• "আজকের গরমে বাইরে যাওয়া কি ঠিক হবে?"\n' +
        '• "নিকটস্থ হাসপাতাল কোথায়?"\n\n' +
        'তথ্য মুছে ফেলার জন্য যেকোনো সময় *stop* লিখুন।\n\n' +
        '_এটি কেবল সাধারণ স্বাস্থ্য পরামর্শ। জরুরি অবস্থায় 112 নম্বরে কল করুন।_',
    };
  }

  if (locale === 'ar') {
    const who =
      p.subjectType === 'infant'
        ? 'طفلك الرضيع'
        : p.subjectType === 'child'
        ? 'طفلك'
        : p.subjectType === 'pregnant_person'
        ? 'حملك'
        : p.subjectType === 'postpartum_person'
        ? 'صحتك بعد الولادة'
        : 'صحتك';
    const where = p.location?.name ? ` في ${p.location.name}` : p.location ? ' في موقعك' : '';

    return {
      kind: 'text',
      body:
        `تم كل شيء! سأضع ${who}${where} في الاعتبار دائمًا. 🌸\n\n` +
        'يمكنك سؤالي عن أشياء مثل:\n' +
        '• "طفلي يعاني من الحمى، ماذا أفعل؟"\n' +
        '• "هل الخروج بعد ظهر اليوم آمن؟"\n' +
        '• "أين أقرب مستشفى إليّ؟"\n\n' +
        'أرسل *stop* في أي وقت لحذف جميع بياناتك المحفوظة.\n\n' +
        '_أقدم إرشادات صحية عامة وليس تشخيصًا طبيًا. في حالات الطوارئ اتصل بالرقم 112._',
    };
  }

  if (locale === 'fr') {
    const who =
      p.subjectType === 'infant'
        ? 'votre bébé'
        : p.subjectType === 'child'
        ? 'votre enfant'
        : p.subjectType === 'pregnant_person'
        ? 'votre grossesse'
        : p.subjectType === 'postpartum_person'
        ? 'votre santé post-partum'
        : 'votre santé';
    const where = p.location?.name ? ` à ${p.location.name}` : p.location ? ' à votre position' : '';

    return {
      kind: 'text',
      body:
        `Tout est prêt ! Je garderai ${who}${where} à l'esprit. 🌸\n\n` +
        'Vous pouvez me poser des questions comme :\n' +
        '• « Mon bébé a de la fièvre, que dois-je faire ? »\n' +
        '• « Puis-je sortir cet après-midi en toute sécurité ? »\n' +
        '• « Où se trouve l\'hôpital le plus proche ? »\n\n' +
        'Envoyez *stop* à tout moment pour effacer toutes vos données enregistrées.\n\n' +
        '_Je fournis des conseils généraux, pas un diagnostic. En cas d\'urgence, appelez le 112._',
    };
  }

  if (locale === 'sw') {
    const who =
      p.subjectType === 'infant'
        ? 'mtoto wako mchanga'
        : p.subjectType === 'child'
        ? 'mtoto wako'
        : p.subjectType === 'pregnant_person'
        ? 'ujauzito wako'
        : p.subjectType === 'postpartum_person'
        ? 'afya yako baada ya kujifungua'
        : 'afya yako';
    const where = p.location?.name ? ` huko ${p.location.name}` : p.location ? ' eneo lako' : '';

    return {
      kind: 'text',
      body:
        `Kila kitu kiko tayari! Nitazingatia ${who}${where}. 🌸\n\n` +
        'Unaweza kuniuliza mambo kama:\n' +
        '• "Mtoto wangu ana homa, nifanye nini?"\n' +
        '• "Je, ni salama kutoka nje mchana wa leo?"\n' +
        '• "Wapi hospitali ya karibu?"\n\n' +
        'Tuma neno *stop* wakati wowote kufuta taarifa zako zote zilizohifadhiwa.\n\n' +
        '_Huu ni ushauri wa jumla wa afya, si utambuzi wa matibabu. Kwa dharura piga 112._',
    };
  }

  if (locale === 'ha') {
    const who =
      p.subjectType === 'infant'
        ? 'jaririnku'
        : p.subjectType === 'child'
        ? 'yaronku'
        : p.subjectType === 'pregnant_person'
        ? 'cikinku'
        : p.subjectType === 'postpartum_person'
        ? 'lafiyarku bayan haihuwa'
        : 'lafiyarku';
    const where = p.location?.name ? ` a ${p.location.name}` : p.location ? ' a wurinku' : '';

    return {
      kind: 'text',
      body:
        `Komai ya daidaita! Zan kula da ${who}${where}. 🌸\n\n` +
        'Kuna iya tambayata abubuwa kamar:\n' +
        '• "Jaririna na zazzabi, me ya kamata in yi?"\n' +
        '• "Shin yana da lafiya fita waje a yau da rana?"\n' +
        '• "Ina asibiti mafi kusa?"\n\n' +
        'Aika *stop* a kowane lokaci don share duk bayanan da aka ajiye.\n\n' +
        '_Wannan shawarar lafiya ce ta gaba ɗaya, ba binciken likita ba. Don gaggawa kira 112._',
    };
  }

  if (locale === 'yo') {
    const who =
      p.subjectType === 'infant'
        ? 'ọmọ tuntun rẹ'
        : p.subjectType === 'child'
        ? 'ọmọ rẹ'
        : p.subjectType === 'pregnant_person'
        ? 'oyun rẹ'
        : p.subjectType === 'postpartum_person'
        ? 'ìlera rẹ lẹhin ibimọ'
        : 'ìlera rẹ';
    const where = p.location?.name ? ` ní ${p.location.name}` : p.location ? ' ní agbègbè rẹ' : '';

    return {
      kind: 'text',
      body:
        `Gbogbo rẹ ti ṣetán! Emi yoo ranti ${who}${where}. 🌸\n\n` +
        'O le bi mi ni awọn ibeere bii:\n' +
        '• "Ọmọ mi ni ibà, kí ni kí n ṣe?"\n' +
        '• "Ṣe o ni aabo lati jade lọ ni ọsan yii?"\n' +
        '• "Nibo ni ile-iwosan ti o sunmọ julọ wa?"\n\n' +
        'Fi *stop* ránṣẹ́ nigbakugba lati pa gbogbo alaye rẹ ti o ti fipamọ rẹ́.\n\n' +
        '_Itọsọna ilera gbogbogbo ni eyi, kii ṣe ayẹwo dokita. Fun pajawiri pe 112._',
    };
  }

  if (locale === 'am') {
    const who =
      p.subjectType === 'infant'
        ? 'የጨቅላ ህፃንዎን'
        : p.subjectType === 'child'
        ? 'የልጅዎን'
        : p.subjectType === 'pregnant_person'
        ? 'የእርግዝናዎን'
        : p.subjectType === 'postpartum_person'
        ? 'ከወሊድ በኋላ ጤናዎን'
        : 'ጤናዎን';
    const where = p.location?.name ? ` በ${p.location.name}` : p.location ? ' በአካባቢዎ' : '';

    return {
      kind: 'text',
      body:
        `ሁሉም ተዘጋጅቷል! ${who}${where} ከግምት ውስጥ አስገባለሁ። 🌸\n\n` +
        'እንደነዚህ ያሉ ጥያቄዎችን መጠየቅ ይችላሉ፡\n' +
        '• "ልጄ ትኩሳት አለበት፣ ምን ማድረግ አለብኝ?"\n' +
        '• "ዛሬ ከሰዓት በኋላ ወደ ውጭ መውጣት ደህንነቱ የተጠበቀ ነው?"\n' +
        '• "በአቅራቢያ የሚገኝ ሆስፒታል የት አለ?"\n\n' +
        'የተቀመጠውን መረጃ በሙሉ ለመሰረዝ በማንኛውም ጊዜ *stop* ብለው ይላኩ።\n\n' +
        '_ይህ አጠቃላይ የጤና መመሪያ እንጂ የህክምና ምርመራ አይደለም። ለአደጋ ጊዜ ወደ 112 ይደውሉ።_',
    };
  }

  if (locale === 'zu') {
    const who =
      p.subjectType === 'infant'
        ? 'ingane yakho'
        : p.subjectType === 'child'
        ? 'umntwana wakho'
        : p.subjectType === 'pregnant_person'
        ? 'ukukhulelwa kwakho'
        : p.subjectType === 'postpartum_person'
        ? 'impilo yakho ngemuva kokubeletha'
        : 'impilo yakho';
    const where = p.location?.name ? ` e-${p.location.name}` : p.location ? ' endaweni yakho' : '';

    return {
      kind: 'text',
      body:
        `Konke sekumi ngomumo! Ngizokhumbula ${who}${where}. 🌸\n\n` +
        'Ungangibuza izinto ezinjengalezi:\n' +
        '• "Ingane yami inomkhuhlane, kumele ngenzeni?"\n' +
        '• "Kuphephile yini ukuphuma ntambama namhlanje?"\n' +
        '• "Ikuphi isibhedlela esiseduze?"\n\n' +
        'Thumela *stop* noma nini ukuze ususe yonke imininingwane egciniwe.\n\n' +
        '_Lokhu kungukuqondiswa kwezempilo okuvamile, hhayi ukuxilongwa kodokotela. Esimeni esiphuthumayo shayela ku-112._',
    };
  }

  const who =
    p.subjectType === 'infant'
      ? 'your baby'
      : p.subjectType === 'child'
      ? 'your child'
      : p.subjectType === 'pregnant_person'
      ? 'your pregnancy'
      : p.subjectType === 'postpartum_person'
      ? 'you after birth'
      : 'you';

  const where = p.location?.name ? ` in ${p.location.name}` : p.location ? ' at your location' : '';

  return {
    kind: 'text',
    body:
      `All set — I'll keep ${who}${where} in mind. 🌸\n\n` +
      'You can ask me things like:\n' +
      '• "My baby has a fever, what should I do?"\n' +
      '• "Is it safe to go out this afternoon?"\n' +
      '• "What\'s the air quality today?"\n' +
      '• "Where is the nearest hospital?"\n\n' +
      'Say *stop* any time to delete everything I have saved.\n\n' +
      '_I give general guidance, not a diagnosis. For emergencies call 112._',
  };
}

export function stopConfirmation(locale = 'en') {
  const loc = normalizeLocale(locale);
  if (loc === 'te') {
    return {
      kind: 'text',
      body:
        'పూర్తయింది — మీరు ఆప్ట్-అవుట్ అయ్యారు మరియు మీ గురించి సేవ్ చేసిన వివరాలన్నీ శాశ్వతంగా తొలగించబడ్డాయి. 🛑\n\n' +
        'మీరు మళ్లీ సందేశం పంపితే తప్ప నేను స్పందించను. మళ్లీ ప్రారంభించాలనుకుంటే *start* అని పంపండి.\n\n' +
        'ఆరోగ్యంగా ఉండండి! 🌸',
    };
  }

  if (loc === 'hi') {
    return {
      kind: 'text',
      body:
        'हो गया — आप चैट से बाहर (Opt-Out) हो गए हैं और आपकी सभी व्यक्तिगत जानकारी व चैट हिस्ट्री स्थायी रूप से हटा दी गई है। 🛑\n\n' +
        'जब तक आप दोबारा संदेश नहीं भेजेंगे, मैं संपर्क नहीं करूँगी। पुनः शुरू करने के लिए *start* लिखें।\n\n' +
        'अपना ध्यान रखें! 🌸',
    };
  }

  if (loc === 'ta') {
    return {
      kind: 'text',
      body:
        'முடிந்தது — உங்கள் சந்தா நிறுத்தப்பட்டது மற்றும் உங்கள் விவரங்கள் அனைத்தும் நிரந்தரமாக நீக்கப்பட்டுவிட்டன. 🛑\n\n' +
        'மீண்டும் தொடங்க *start* என அனுப்பவும்.\n\n' +
        'உடல்நலத்தை பாதுகாத்துக் கொள்ளுங்கள்! 🌸',
    };
  }

  if (loc === 'kn') {
    return {
      kind: 'text',
      body:
        'ಮುಗಿದಿದೆ — ನಿಮ್ಮ ಆಪ್ಟ್-ಔಟ್ ಪೂರ್ಣಗೊಂಡಿದೆ ಮತ್ತು ಎಲ್ಲಾ ವೈಯಕ್ತಿಕ ವಿವರಗಳು ಶಾಶ್ವತವಾಗಿ ಅಳಿಸಲ್ಪಟ್ಟಿವೆ. 🛑\n\n' +
        'ಮತ್ತೆ ಪ್ರಾರಂಭಿಸಲು *start* ಎಂದು ಕಳುಹಿಸಿ.\n\n' +
        'ಆರೋಗ್ಯವಾಗಿರಿ! 🌸',
    };
  }

  if (loc === 'ml') {
    return {
      kind: 'text',
      body:
        'പൂർത്തിയായി — നിങ്ങളുടെ വിവരങ്ങൾ ശാശ്വതമായി നീക്കം ചെയ്തു. 🛑\n\n' +
        'വീണ്ടും ആരംഭിക്കാൻ *start* എന്ന് അയക്കുക.\n\n' +
        'ആരോഗ്യം ശ്രദ്ധിക്കുക! 🌸',
    };
  }

  if (loc === 'mr') {
    return {
      kind: 'text',
      body:
        'झाले — आपण ऑप्ट-आउट केले आहे आणि आपला सर्व डेटा कायमस्वरूपी हटवला गेला आहे. 🛑\n\n' +
        'पुन्हा सुरू करण्यासाठी *start* पाठवा.\n\n' +
        'आपली काळजी घ्या! 🌸',
    };
  }

  if (loc === 'bn') {
    return {
      kind: 'text',
      body:
        'সম্পন্ন — আপনি অপ্ট-আউট করেছেন এবং আপনার সমস্ত তথ্য স্থায়ীভাবে মুছে ফেলা হয়েছে। 🛑\n\n' +
        'আবার শুরু করতে *start* লিখুন।\n\n' +
        'নিজের যত্ন নিন! 🌸',
    };
  }

  if (loc === 'ar') {
    return {
      kind: 'text',
      body:
        'تم بنجاح — تم إلغاء اشتراكك وحذف جميع بياناتك الشخصية وسجل محادثاتك نهائيًا. 🛑\n\n' +
        'لن أتواصل معك مجددًا إلا إذا أرسلت رسالة جديدة. إذا أردت البدء من جديد، أرسل *start*.\n\n' +
        'دمت بصحة وعافية! 🌸',
    };
  }

  if (loc === 'fr') {
    return {
      kind: 'text',
      body:
        'C\'est fait — vous vous êtes désabonné(e) et toutes vos données personnelles ont été définitivement supprimées. 🛑\n\n' +
        'Je ne vous recontacterai plus à moins que vous ne m\'écriviez. Si vous souhaitez recommencer, envoyez *start*.\n\n' +
        'Prenez bien soin de vous ! 🌸',
    };
  }

  if (loc === 'sw') {
    return {
      kind: 'text',
      body:
        'Imekamilika — umejiondoa na taarifa zako zote binafsi zimefutwa kabisa. 🛑\n\n' +
        'Sitawasiliana nawe tena isipokuwa ukituma ujumbe. Ukitaka kuanza upya, tuma neno *start*.\n\n' +
        'Kila la heri na afya njema! 🌸',
    };
  }

  if (loc === 'ha') {
    return {
      kind: 'text',
      body:
        'An gama — kun fita daga tsarin kuma an goge duk bayanan sirrinku gaba daya. 🛑\n\n' +
        'Ba zan sake tuntuɓarku ba sai idan kun aiko da sako. Idan kuna son sake farawa, aiko da *start*.\n\n' +
        'A kula da lafiya! 🌸',
    };
  }

  if (loc === 'yo') {
    return {
      kind: 'text',
      body:
        'O ti parí — o ti jáde kúrò nínú ètò náà àti pé gbogbo àwọn àlàyé rẹ ti parẹ́ pátápátá. 🛑\n\n' +
        'N kò ní kàn sí ọ mọ́ àfi tí o bá kọ̀wé sí mi. Tí o bá fẹ́ bẹ̀rẹ̀ lẹ́ẹ̀kansi, kọ *start*.\n\n' +
        'Tọ́jú ara rẹ dáadáa! 🌸',
    };
  }

  if (loc === 'am') {
    return {
      kind: 'text',
      body:
        'ተጠናቋል — ከአገልግሎቱ ወጥተዋል እና የግል መረጃዎ በሙሉ በቋሚነት ተሰርዟል። 🛑\n\n' +
        'እርስዎ መልእክት ካልላኩ በስተቀር ዳግም አላገኝዎትም። እንደገና ለመጀመር *start* ብለው ይላኩ።\n\n' +
        'ጤናዎ ይጠበቅ! 🌸',
    };
  }

  if (loc === 'zu') {
    return {
      kind: 'text',
      body:
        'Kwenziwe — uphumile ohlelweni futhi yonke imininingwane yakho isusiwe unomphela. 🛑\n\n' +
        'Ngeke ngiphinde ngikuthinte ngaphandle uma uthumela umyalezo. Uma ufuna ukuqala phansi, thumela *start*.\n\n' +
        'Zinakekele kahle! 🌸',
    };
  }

  return {
    kind: 'text',
    body:
      "Done — You have been opted out from Dayli AI. 🛑\n\n" +
      "All your personal details, session history, and location data have been automatically and permanently deleted.\n\n" +
      'You will not hear from me again unless you message us. If you ever want to restart, just message *START*.\n\n' +
      'Take care of yourself! 🌸',
  };
}

export { ID as ONBOARDING_IDS };
