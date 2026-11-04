/**
 * ==============================================================================
 * Dayli AI — Interactive Multilingual MCQ Feedback Survey
 * ==============================================================================
 * Designed directly around the dashboard's "User Feedbacks & CSAT Surveillance":
 *   - CSAT Satisfaction (Helpful vs Needs Info)
 *   - 1⭐ to 5⭐ Star Rating Distribution
 *   - Top Improvement Drivers & Negative Feedback Reasons (unclear_advice, wrong_location,
 *     hospital_info, wrong_language, too_slow, other)
 *   - Core Dayli AI Services (Clinical Triage, Hydration Advisory, Hospital Routing,
 *     Daily Climate Brief)
 *   - Language & Comprehension Surveillance (very_clear, mostly_clear, terms_hard, lang_needs_work)
 *   - Zero-PHI DPDP Act 2023 & HIPAA compliance (completely anonymous, no names/numbers)
 *
 * Adheres strictly to Meta WhatsApp Cloud API limits:
 *   - Button titles <= 20 chars
 *   - List row titles <= 24 chars
 *   - List row descriptions <= 72 chars
 *   - List button label <= 20 chars
 *   - Header text <= 60 chars
 *   - Body text <= 1024 chars
 */
import { Store } from './store.js';

export const SURVEY_IDS = {
  // Survey Triggers & Flow Controls
  start: 'surv_start',
  skip: 'surv_skip',

  // Q1: Overall Helpfulness / Star Rating (1–5 Stars)
  q1Prefix: 'surv_q1_',
  q1_5: 'surv_q1_5',
  q1_4: 'surv_q1_4',
  q1_3: 'surv_q1_3',
  q1_2: 'surv_q1_2',
  q1_1: 'surv_q1_1',

  // Q2-Service (For 4–5 Stars): Top Core Service Evaluated (Maps to Dashboard Core Services)
  q2ServicePrefix: 'surv_q2_s_',
  q2ServiceTriage: 'surv_q2_s_triage',
  q2ServiceHydration: 'surv_q2_s_hydration',
  q2ServiceHospital: 'surv_q2_s_hospital',
  q2ServiceClimate: 'surv_q2_s_climate',
  q2ServiceOther: 'surv_q2_s_other',

  // Q2-Improve (For 1–3 Stars): Improvement Drivers (Maps to Dashboard Negative Feedback Reasons)
  q2ReasonPrefix: 'surv_q2_r_',
  q2ReasonUnclear: 'surv_q2_r_unclear',
  q2ReasonLocation: 'surv_q2_r_location',
  q2ReasonHospital: 'surv_q2_r_hospital',
  q2ReasonLanguage: 'surv_q2_r_language',
  q2ReasonSlow: 'surv_q2_r_slow',
  q2ReasonOther: 'surv_q2_r_other',

  // Q3: Advice Clarity & Comprehension (Maps to CSAT Comprehension Surveillance)
  q3Prefix: 'surv_q3_',
  q3Clear: 'surv_q3_clear',
  q3Mostly: 'surv_q3_mostly',
  q3Hard: 'surv_q3_hard',
  q3Lang: 'surv_q3_lang',

  // Backwards Compatibility Aliases
  q2Prefix: 'surv_q2_',
  q2Clear: 'surv_q3_clear',
  q2Mostly: 'surv_q3_mostly',
  q2Hard: 'surv_q3_hard',
  q2Lang: 'surv_q3_lang',
  q3Hydration: 'surv_q2_s_hydration',
  q3Triage: 'surv_q2_s_triage',
  q3Hospital: 'surv_q2_s_hospital',
  q3Weather: 'surv_q2_s_climate',
  q3Other: 'surv_q2_s_other',
};

const SURVEY_TRIGGER_REGEX = /^(survey|feedback|rate|review|సర్వే|ఫీడ్‌బ్యాక్|రివ్యూ|రైటింగ్|सर्वे|फीडबैक|रेटिंग|समीक्षा)/i;
const SURVEY_SKIP_REGEX = /^(skip|cancel|stop survey|దాటవేయి|వద్దు|రద్దు|छोड़ें|रद्द|रहने दें)/i;

/**
 * Checks whether inbound message triggers the feedback survey.
 * @param {string} text
 * @param {string} [replyId='']
 * @returns {boolean}
 */
export function isSurveyTrigger(text = '', replyId = '') {
  if (replyId === SURVEY_IDS.start) return true;
  return SURVEY_TRIGGER_REGEX.test(String(text || '').trim());
}

/**
 * Checks whether user requested to skip or dismiss survey.
 * @param {string} text
 * @param {string} [replyId='']
 * @returns {boolean}
 */
export function isSurveySkip(text = '', replyId = '') {
  if (replyId === SURVEY_IDS.skip) return true;
  return SURVEY_SKIP_REGEX.test(String(text || '').trim());
}

/**
 * Prompt offering user to take a 30-second Care Quality Survey.
 * @param {'en'|'te'|'hi'} locale
 * @returns {object} WhatsApp interactive button message
 */
export function surveyInvitePrompt(locale = 'en') {
  if (locale === 'te') {
    return {
      kind: 'buttons',
      body: '🌸 తల్లులు మరియు కుటుంబాల కోసం డేలీ AIని మరింత మెరుగుపరచడానికి 30 సెకన్ల చిన్న సర్వేలో పాల్గొనండి!',
      buttons: [
        { id: SURVEY_IDS.start, title: 'సర్వే చేయండి 📋' },
        { id: SURVEY_IDS.skip, title: 'దాటవేయండి ⏭️' },
      ],
    };
  }

  if (locale === 'hi') {
    return {
      kind: 'buttons',
      body: '🌸 माताओं और परिवारों के लिए Dayli AI को और बेहतर बनाने के लिए 30 सेकंड का छोटा सर्वे दें!',
      buttons: [
        { id: SURVEY_IDS.start, title: 'सर्वे शुरू करें 📋' },
        { id: SURVEY_IDS.skip, title: 'छोड़ें ⏭️' },
      ],
    };
  }

  if (locale === 'ta') {
    return {
      kind: 'buttons',
      body: '🌸 தாய்மார்கள் மற்றும் குடும்பங்களுக்காக டேலி AI-ஐ மேம்படுத்த 30 வினாடி கருத்துக்கணிப்பில் பங்கேற்கவும்!',
      buttons: [
        { id: SURVEY_IDS.start, title: 'தொடங்குங்கள் 📋' },
        { id: SURVEY_IDS.skip, title: 'தவிர் ⏭️' },
      ],
    };
  }

  if (locale === 'kn') {
    return {
      kind: 'buttons',
      body: '🌸 ತಾಯಂದಿರು ಮತ್ತು ಕುಟುಂಬಗಳಿಗಾಗಿ ಡೇಲಿ AI ಅನ್ನು ಇನ್ನಷ್ಟು ಉತ್ತಮಗೊಳಿಸಲು 30 ಸೆಕೆಂಡಿನ ಸಣ್ಣ ಸಮೀಕ್ಷೆಯಲ್ಲಿ ಭಾಗವಹಿಸಿ!',
      buttons: [
        { id: SURVEY_IDS.start, title: 'ಪ್ರಾರಂಭಿಸಿ 📋' },
        { id: SURVEY_IDS.skip, title: 'ಬಿಟ್ಟುಬಿಡಿ ⏭️' },
      ],
    };
  }

  if (locale === 'ml') {
    return {
      kind: 'buttons',
      body: '🌸 അമ്മമാർക്കും കുടുംബങ്ങൾക്കും ഡേലി AI കൂടുതൽ മികച്ചതാക്കാൻ 30 സെക്കൻഡ് സർവേയിൽ പങ്കെടുക്കൂ!',
      buttons: [
        { id: SURVEY_IDS.start, title: 'പങ്കെടുക്കൂ 📋' },
        { id: SURVEY_IDS.skip, title: 'ഒഴിവാക്കൂ ⏭️' },
      ],
    };
  }

  if (locale === 'mr') {
    return {
      kind: 'buttons',
      body: '🌸 माता आणि कुटुंबांसाठी Dayli AI अधिक उत्तम करण्यासाठी ३० सेकंदांचे लहान सर्वेक्षण पूर्ण करा!',
      buttons: [
        { id: SURVEY_IDS.start, title: 'सुरू करा 📋' },
        { id: SURVEY_IDS.skip, title: 'वगळा ⏭️' },
      ],
    };
  }

  if (locale === 'bn') {
    return {
      kind: 'buttons',
      body: '🌸 মা ও পরিবারগুলোর জন্য Dayli AI আরো উন্নত করতে ৩০ সেকেন্ডের একটি ছোট সমীক্ষায় অংশ নিন!',
      buttons: [
        { id: SURVEY_IDS.start, title: 'শুরু করুন 📋' },
        { id: SURVEY_IDS.skip, title: 'বাদ দিন ⏭️' },
      ],
    };
  }

  if (locale === 'ar') {
    return {
      kind: 'buttons',
      body: '🌸 ساعدنا في تحسين Dayli AI للأمهات والعائلات من خلال استطلاع سريع لمدة 30 ثانية!',
      buttons: [
        { id: SURVEY_IDS.start, title: 'بدء الاستطلاع 📋' },
        { id: SURVEY_IDS.skip, title: 'تخطي ⏭️' },
      ],
    };
  }

  if (locale === 'fr') {
    return {
      kind: 'buttons',
      body: '🌸 Aidez-nous à améliorer Dayli AI pour les mères et les familles grâce à une enquête rapide de 30 secondes !',
      buttons: [
        { id: SURVEY_IDS.start, title: 'Participer 📋' },
        { id: SURVEY_IDS.skip, title: 'Passer ⏭️' },
      ],
    };
  }

  if (locale === 'sw') {
    return {
      kind: 'buttons',
      body: '🌸 Tusaidie kuboresha Dayli AI kwa ajili ya akina mama na familia kwa kushiriki utafiti mfupi wa sekunde 30!',
      buttons: [
        { id: SURVEY_IDS.start, title: 'Anza Utafiti 📋' },
        { id: SURVEY_IDS.skip, title: 'Ruka ⏭️' },
      ],
    };
  }

  if (locale === 'ha') {
    return {
      kind: 'buttons',
      body: '🌸 Taimaka mana inganta Dayli AI don iyaye mata da iyalai tare da ɗan binciken gaggawa na daƙiƙa 30!',
      buttons: [
        { id: SURVEY_IDS.start, title: 'Fara Bincike 📋' },
        { id: SURVEY_IDS.skip, title: 'Tsallake ⏭️' },
      ],
    };
  }

  if (locale === 'yo') {
    return {
      kind: 'buttons',
      body: '🌸 Ran wa lọwọ lati mu Dayli AI dara si fun awọn iya ati awọn idile pẹlu iwadii iṣẹju 30 ti o yara!',
      buttons: [
        { id: SURVEY_IDS.start, title: 'Bẹrẹ Iwadii 📋' },
        { id: SURVEY_IDS.skip, title: 'Fojufo ⏭️' },
      ],
    };
  }

  if (locale === 'am') {
    return {
      kind: 'buttons',
      body: '🌸 እናቶችና ቤተሰቦችን ለመደገፍ Dayli AIን ለማሻሻል ፈጣን የ30 ሰከንድ የዳሰሳ ጥናት ይውሰዱ!',
      buttons: [
        { id: SURVEY_IDS.start, title: 'ጥናት ጀምር 📋' },
        { id: SURVEY_IDS.skip, title: 'ዝለል ⏭️' },
      ],
    };
  }

  if (locale === 'zu') {
    return {
      kind: 'buttons',
      body: '🌸 Sisize sithuthukise i-Dayli AI yomama nemindeni ngenhlolovo esheshayo yemizuzwana engama-30!',
      buttons: [
        { id: SURVEY_IDS.start, title: 'Qala Inhlolovo 📋' },
        { id: SURVEY_IDS.skip, title: 'Yeqa ⏭️' },
      ],
    };
  }

  return {
    kind: 'buttons',
    body: '🌸 Help us improve Dayli AI for mothers and families with a quick 30-second feedback survey!',
    buttons: [
      { id: SURVEY_IDS.start, title: 'Take Survey 📋' },
      { id: SURVEY_IDS.skip, title: 'Skip ⏭️' },
    ],
  };
}

/**
 * MCQ Question 1: Satisfaction & Star Rating (1 to 5 Stars)
 * Feeds directly into Dashboard "CSAT Satisfaction %" and "Star Rating Distribution"
 * @param {'en'|'te'|'hi'} locale
 * @returns {object} WhatsApp interactive list message
 */
export function surveyQ1Prompt(locale = 'en') {
  if (locale === 'te') {
    return {
      kind: 'list',
      header: 'ప్రశ్న 1/3: రేటింగ్',
      body: 'ఈరోజు డేలీ AI అందించిన ఆరోగ్య మరియు వాతావరణ సలహాలు మీకు ఎంతవరకు ఉపయోగపడ్డాయి?',
      buttonText: 'రేటింగ్ ఇవ్వండి ⭐',
      sections: [
        {
          title: 'మీ రేటింగ్ ఎంచుకోండి',
          rows: [
            { id: SURVEY_IDS.q1_5, title: '⭐⭐⭐⭐⭐ అద్భుతం', description: 'చాలా ఉపయోగపడింది మరియు భరోసానిచ్చింది' },
            { id: SURVEY_IDS.q1_4, title: '⭐⭐⭐⭐ బాగుంది', description: 'మంచి ఉపయోగకరమైన సలహాలు లభించాయి' },
            { id: SURVEY_IDS.q1_3, title: '⭐⭐⭐ పర్వాలేదు', description: 'సాధారణ సమాచారం, ఇంకా మెరుగవ్వచ్చు' },
            { id: SURVEY_IDS.q1_2, title: '⭐⭐ మెరుగుపడాలి', description: 'సరిపడా వివరాలు రాలేదు' },
            { id: SURVEY_IDS.q1_1, title: '⭐ ఉపయోగపడలేదు', description: 'నా సమస్యకు సహాయం అందలేదు' },
          ],
        },
      ],
    };
  }

  if (locale === 'hi') {
    return {
      kind: 'list',
      header: 'प्रश्न 1/3: रेटिंग',
      body: 'आज Dayli AI द्वारा दी गई स्वास्थ्य और मौसम सलाह आपके लिए कितनी मददगार रही?',
      buttonText: 'रेटिंग चुनें ⭐',
      sections: [
        {
          title: 'अपनी रेटिंग चुनें',
          rows: [
            { id: SURVEY_IDS.q1_5, title: '⭐⭐⭐⭐⭐ उत्कृष्ट', description: 'बहुत मददगार और तसल्लीबख्श रही' },
            { id: SURVEY_IDS.q1_4, title: '⭐⭐⭐⭐ अच्छी', description: 'सलाह स्पष्ट और उपयोगी थी' },
            { id: SURVEY_IDS.q1_3, title: '⭐⭐⭐ सामान्य', description: 'ठीक थी, पर और बेहतर हो सकती है' },
            { id: SURVEY_IDS.q1_2, title: '⭐⭐ सुधार चाहिए', description: 'पूरी जानकारी नहीं मिल पाई' },
            { id: SURVEY_IDS.q1_1, title: '⭐ उपयोगी नहीं', description: 'मेरी समस्या का समाधान नहीं हुआ' },
          ],
        },
      ],
    };
  }

  return {
    kind: 'list',
    header: 'Question 1 of 3: Rating',
    body: 'How helpful was Dayli AI maternal and climate guidance for you today?',
    buttonText: 'Select Rating ⭐',
    sections: [
      {
        title: 'Select Star Rating',
        rows: [
          { id: SURVEY_IDS.q1_5, title: '⭐⭐⭐⭐⭐ Excellent', description: 'Extremely helpful and reassuring' },
          { id: SURVEY_IDS.q1_4, title: '⭐⭐⭐⭐ Good', description: 'Helpful and easy to follow' },
          { id: SURVEY_IDS.q1_3, title: '⭐⭐⭐ Average', description: 'Fair, but could be better' },
          { id: SURVEY_IDS.q1_2, title: '⭐⭐ Needs Work', description: 'Missing important information' },
          { id: SURVEY_IDS.q1_1, title: '⭐ Poor', description: 'Did not help my situation' },
        ],
      },
    ],
  };
}

/**
 * MCQ Question 2 (Service Branch: 4-5 Stars): Most Helpful Core Dayli AI Service
 * Feeds directly into Dashboard "Feedback by WhatsApp AI Service"
 * @param {'en'|'te'|'hi'} locale
 * @returns {object} WhatsApp interactive list message
 */
export function surveyQ2ServicePrompt(locale = 'en') {
  if (locale === 'te') {
    return {
      kind: 'list',
      header: 'ప్రశ్న 2/3: సేవ',
      body: 'డేలీ AI అందించే సేవలలో మీకు ఏది ఎక్కువగా ఉపయోగపడింది?',
      buttonText: 'సేవను ఎంచుకోండి',
      sections: [
        {
          title: 'డేలీ AI సేవలు',
          rows: [
            { id: SURVEY_IDS.q2ServiceTriage, title: '🩺 లక్షణాల తనిఖీ', description: 'గర్భధారణ సమస్యలు మరియు జాగ్రత్తలు' },
            { id: SURVEY_IDS.q2ServiceHydration, title: '💧 హైడ్రేషన్ సలహాలు', description: 'ఎండలో నీరు, ORSL మరియు ఆహార నియమాలు' },
            { id: SURVEY_IDS.q2ServiceHospital, title: '🏥 ప్రసవ ఆసుపత్రి', description: 'సమీప లేబర్ రూమ్ & బెడ్ వివరాలు' },
            { id: SURVEY_IDS.q2ServiceClimate, title: '☀️ వాతావరణ సమాచారం', description: 'రోజువారీ ఎండ తీవ్రత & కాలుష్య వివరాలు' },
            { id: SURVEY_IDS.q2ServiceOther, title: '💬 ఇతర సలహాలు', description: 'సాధారణ ఆరోగ్య మార్గదర్శకత్వం' },
          ],
        },
      ],
    };
  }

  if (locale === 'hi') {
    return {
      kind: 'list',
      header: 'प्रश्न 2/3: सेवा',
      body: 'Dayli AI की कौन सी सुविधा आज आपके लिए सबसे ज्यादा उपयोगी रही?',
      buttonText: 'सुविधा चुनें',
      sections: [
        {
          title: 'मुख्य स्वास्थ्य सेवाएं',
          rows: [
            { id: SURVEY_IDS.q2ServiceTriage, title: '🩺 लक्षण व परामर्श', description: 'गर्भावस्था लक्षण व खतरे के संकेत' },
            { id: SURVEY_IDS.q2ServiceHydration, title: '💧 हाइड्रेशन सलाह', description: 'गर्मी से बचाव, ओआरएसएल व पानी की सलाह' },
            { id: SURVEY_IDS.q2ServiceHospital, title: '🏥 अस्पताल व लेबर रूम', description: 'नजदीकी अस्पताल व बेड की उपलब्धता' },
            { id: SURVEY_IDS.q2ServiceClimate, title: '☀️ मौसम व लू चेतावनी', description: 'दैनिक तापमान व प्रदूषण का हाल' },
            { id: SURVEY_IDS.q2ServiceOther, title: '💬 अन्य सलाह', description: 'सामान्य स्वास्थ्य जानकारी' },
          ],
        },
      ],
    };
  }

  return {
    kind: 'list',
    header: 'Question 2 of 3: Service',
    body: 'Which Dayli AI feature helped you the most today?',
    buttonText: 'Select Service 🩺',
    sections: [
      {
        title: 'Core Health Services',
        rows: [
          { id: SURVEY_IDS.q2ServiceTriage, title: '🩺 Symptom Triage', description: 'Checked maternal & pregnancy red flags' },
          { id: SURVEY_IDS.q2ServiceHydration, title: '💧 Hydration Advice', description: 'Heat safety, ORSL & water alerts' },
          { id: SURVEY_IDS.q2ServiceHospital, title: '🏥 Labour Room & Bed', description: 'Found nearest ready hospital & beds' },
          { id: SURVEY_IDS.q2ServiceClimate, title: '☀️ Climate & Weather', description: 'Daily heatwave & AQI risk brief' },
          { id: SURVEY_IDS.q2ServiceOther, title: '💬 Other Guidance', description: 'General maternal care advice' },
        ],
      },
    ],
  };
}

/**
 * MCQ Question 2 (Improve Branch: 1-3 Stars): Improvement Drivers
 * Feeds directly into Dashboard "Improvement Drivers & Negative Feedback Reasons"
 * @param {'en'|'te'|'hi'} locale
 * @returns {object} WhatsApp interactive list message
 */
export function surveyQ2ImprovePrompt(locale = 'en') {
  if (locale === 'te') {
    return {
      kind: 'list',
      header: 'ప్రశ్న 2/3: మెరుగుదల',
      body: 'డేలీ AIని మరింత మెరుగ్గా మార్చడానికి మేము ఏమి మార్చాలి?',
      buttonText: 'ఎంచుకోండి',
      sections: [
        {
          title: 'మెరుగుపరచాల్సిన అంశాలు',
          rows: [
            { id: SURVEY_IDS.q2ReasonUnclear, title: '❓ స్పష్టమైన సలహా', description: 'మరింత సులభమైన మరియు వివరమైన సమాచారం' },
            { id: SURVEY_IDS.q2ReasonLocation, title: '📍 లొకేషన్ ఖచ్చితత్వం', description: 'స్థానిక వాతావరణం కచ్చితంగా ఉండాలి' },
            { id: SURVEY_IDS.q2ReasonHospital, title: '🏥 ఆసుపత్రి సమాచారం', description: 'బెడ్స్ మరియు లేబర్ రూమ్ వివరాలు కావాలి' },
            { id: SURVEY_IDS.q2ReasonLanguage, title: '🗣️ సులభమైన భాష', description: 'వైద్య పదాలు లేకుండా సాధారణ తెలుగు వాడాలి' },
            { id: SURVEY_IDS.q2ReasonSlow, title: '⏱️ వేగవంతమైన స్పందన', description: 'ఆలస్యం లేకుండా త్వరగా సమాధానం రావాలి' },
            { id: SURVEY_IDS.q2ReasonOther, title: '💬 ఇతర సూచనలు', description: 'మా వైద్య బృందానికి ఇతర సలహా' },
          ],
        },
      ],
    };
  }

  if (locale === 'hi') {
    return {
      kind: 'list',
      header: 'प्रश्न 2/3: सुधार',
      body: 'Dayli AI को आपके लिए और बेहतर बनाने के लिए हमें क्या सुधारना चाहिए?',
      buttonText: 'सुधार चुनें',
      sections: [
        {
          title: 'सुधार के क्षेत्र',
          rows: [
            { id: SURVEY_IDS.q2ReasonUnclear, title: '❓ स्पष्ट परामर्श', description: 'और अधिक सरल और विस्तृत सलाह मिले' },
            { id: SURVEY_IDS.q2ReasonLocation, title: '📍 सटीक स्थान व मौसम', description: 'मेरे क्षेत्र का मौसम और सटीक हो' },
            { id: SURVEY_IDS.q2ReasonHospital, title: '🏥 अस्पताल व बेड स्थिति', description: 'लेबर रूम और अस्पताल की अधिक जानकारी' },
            { id: SURVEY_IDS.q2ReasonLanguage, title: '🗣️ सरल भाषा व शब्द', description: 'कठिन डॉक्टरी शब्दों की जगह आसान हिंदी' },
            { id: SURVEY_IDS.q2ReasonSlow, title: '⏱️ तेज उत्तर', description: 'जवाब मिलने में कम समय लगे' },
            { id: SURVEY_IDS.q2ReasonOther, title: '💬 अन्य सुझाव', description: 'हमारी मेडिकल टीम के लिए कोई अन्य राय' },
          ],
        },
      ],
    };
  }

  return {
    kind: 'list',
    header: 'Question 2 of 3: Improve',
    body: 'What can we improve to make Dayli AI better for you?',
    buttonText: 'Select Improvement',
    sections: [
      {
        title: 'Improvement Areas',
        rows: [
          { id: SURVEY_IDS.q2ReasonUnclear, title: '❓ Clearer Advice', description: 'More specific, easy-to-follow guidance' },
          { id: SURVEY_IDS.q2ReasonLocation, title: '📍 Location & Weather', description: 'More accurate city or weather alerts' },
          { id: SURVEY_IDS.q2ReasonHospital, title: '🏥 Hospital & Beds', description: 'Better labour room status and distance' },
          { id: SURVEY_IDS.q2ReasonLanguage, title: '🗣️ Simpler Language', description: 'Less medical jargon, simpler translation' },
          { id: SURVEY_IDS.q2ReasonSlow, title: '⏱️ Faster Responses', description: 'Reduce chat delay and reply quicker' },
          { id: SURVEY_IDS.q2ReasonOther, title: '💬 Other Feedback', description: 'Other suggestion for our clinical team' },
        ],
      },
    ],
  };
}

/**
 * MCQ Question 3: Advice Clarity & Language Comprehension
 * Feeds directly into Dashboard Language & Understanding Surveillance
 * @param {'en'|'te'|'hi'} locale
 * @returns {object} WhatsApp interactive list message
 */
export function surveyQ3ClarityPrompt(locale = 'en') {
  if (locale === 'te') {
    return {
      kind: 'list',
      header: 'ప్రశ్న 3/3: స్పష్టత',
      body: 'మేము అందించిన వైద్య సలహాలు మీకు అర్థం కావడానికి సులభంగా ఉన్నాయా?',
      buttonText: 'స్పష్టత ఎంచుకోండి',
      sections: [
        {
          title: 'భాష మరియు స్పష్టత',
          rows: [
            { id: SURVEY_IDS.q3Clear, title: '✅ చాలా స్పష్టంగా ఉంది', description: 'సులభమైన తెలుగులో అర్థమైంది' },
            { id: SURVEY_IDS.q3Mostly, title: '👍 దాదాపు అర్థమైంది', description: 'ముఖ్యమైన అంశాలు స్పష్టంగా ఉన్నాయి' },
            { id: SURVEY_IDS.q3Hard, title: '❓ వైద్య పదాలు కష్టం', description: 'కొన్ని పదాలు అర్థం కాలేదు' },
            { id: SURVEY_IDS.q3Lang, title: '🌐 అనువాదం మెరుగుపడాలి', description: 'తెలుగు వాక్యాలు ఇంకా బాగుండాలి' },
          ],
        },
      ],
    };
  }

  if (locale === 'hi') {
    return {
      kind: 'list',
      header: 'प्रश्न 3/3: स्पष्टता',
      body: 'क्या Dayli AI का परामर्श आपकी भाषा में समझने में आसान था?',
      buttonText: 'स्पष्टता चुनें',
      sections: [
        {
          title: 'भाषा और समझ',
          rows: [
            { id: SURVEY_IDS.q3Clear, title: '✅ बहुत स्पष्ट और सरल', description: 'आसानी से समझ आया' },
            { id: SURVEY_IDS.q3Mostly, title: '👍 ज्यादातर समझ आया', description: 'सलाह स्पष्ट थी' },
            { id: SURVEY_IDS.q3Hard, title: '❓ डॉक्टरी शब्द कठिन थे', description: 'कुछ शब्दों में कठिनाई हुई' },
            { id: SURVEY_IDS.q3Lang, title: '🌐 भाषा सुधार चाहिए', description: 'हिंदी वाक्य और बेहतर हों' },
          ],
        },
      ],
    };
  }

  return {
    kind: 'list',
    header: 'Question 3 of 3: Clarity',
    body: 'Was the health guidance easy to read and understand in your language?',
    buttonText: 'Choose Clarity',
    sections: [
      {
        title: 'Language & Clarity',
        rows: [
          { id: SURVEY_IDS.q3Clear, title: '✅ Very Clear & Simple', description: 'Easy to follow without medical jargon' },
          { id: SURVEY_IDS.q3Mostly, title: '👍 Mostly Clear', description: 'Key points were understandable' },
          { id: SURVEY_IDS.q3Hard, title: '❓ Jargon Too Hard', description: 'Difficult medical words' },
          { id: SURVEY_IDS.q3Lang, title: '🌐 Improve Translation', description: 'Phrasing needs improvement' },
        ],
      },
    ],
  };
}

// Backward compatibility prompt aliases
export const surveyQ2Prompt = (locale = 'en') => surveyQ2ServicePrompt(locale);
export const surveyQ3Prompt = (locale = 'en') => surveyQ3ClarityPrompt(locale);

/**
 * Completion confirmation message sent when survey finishes.
 * @param {'en'|'te'|'hi'} locale
 * @returns {object} WhatsApp text message
 */
export function surveyCompletePrompt(locale = 'en') {
  if (locale === 'te') {
    return {
      kind: 'text',
      body:
        '🌸 మీ విలువైన అభిప్రాయాన్ని పంచుకున్నందుకు ధన్యవాదాలు!\n\n' +
        '🔒 భారత ప్రభుత్వ DPDP చట్టం 2023 ప్రకారం మీ సమాధానాలు పూర్తిగా గోప్యంగా (Zero-PHI) భద్రపరచబడ్డాయి.\n\n' +
        'తల్లులు మరియు చిన్నారుల ఆరోగ్యం, వాతావరణ జాగ్రత్తల కోసం మీరు ఎప్పుడైనా మమ్మల్ని సంప్రదించవచ్చు! 🙏',
    };
  }

  if (locale === 'hi') {
    return {
      kind: 'text',
      body:
        '🌸 अपनी बहुमूल्य राय साझा करने के लिए बहुत-बहुत धन्यवाद!\n\n' +
        '🔒 डीपीडीपी (DPDP) अधिनियम 2023 के तहत आपकी राय पूरी तरह गोपनीय (Zero-PHI) सुरक्षित की गई है।\n\n' +
        'मातृ व शिशु स्वास्थ्य और मौसम संबंधी सलाह के लिए आप कभी भी संपर्क कर सकते हैं! 🙏',
    };
  }

  return {
    kind: 'text',
    body:
      '🌸 Thank you so much for your valuable feedback!\n\n' +
      '🔒 Under the DPDP Act 2023, your responses are recorded completely anonymously with strict Zero-PHI privacy.\n\n' +
      'Feel free to message Dayli AI anytime for maternal, child, or climate heat guidance! 🙏',
  };
}

/**
 * Advance the survey state machine upon an inbound event.
 * Maps responses directly to Dashboard Surveillance metrics.
 *
 * @param {object} session User session
 * @param {{ text?: string, replyId?: string }} event Inbound user event
 * @returns {{
 *   handled: boolean,
 *   prompt?: object,
 *   completed?: boolean,
 *   surveyData?: object,
 *   skipped?: boolean
 * }}
 */
export function advanceSurvey(session, event) {
  const replyId = String(event.replyId || '').trim();
  const text = String(event.text || '').trim();
  const locale = session.profile?.locale || 'en';

  // 1. User wants to skip or cancel survey
  if (isSurveySkip(text, replyId)) {
    session.survey = null;
    const skipMsg =
      locale === 'te'
        ? 'సర్వే రద్దు చేయబడింది. మీకు ఏవైనా ఆరోగ్య సందేహాలు ఉంటే దయచేసి అడగండి. 🌸'
        : locale === 'hi'
        ? 'सर्वे छोड़ दिया गया है। किसी भी स्वास्थ्य सवाल के लिए आप कभी भी पूछ सकते हैं। 🌸'
        : 'Survey dismissed. Feel free to ask any maternal or climate health questions anytime. 🌸';
    return { handled: true, skipped: true, prompt: { kind: 'text', body: skipMsg } };
  }

  // 2. User starts or restarts the survey
  if (isSurveyTrigger(text, replyId)) {
    session.survey = {
      active: true,
      step: 1,
      startedAt: Date.now(),
      answers: {
        rating: null,
        branch: null,
        service: null,
        reason: null,
        clarity: null,
      },
    };
    return { handled: true, prompt: surveyQ1Prompt(locale) };
  }

  // If session is not currently in an active survey, let main dispatcher handle it
  if (!session.survey?.active) {
    return { handled: false };
  }

  const s = session.survey;
  if (!s.answers) s.answers = {};

  // 3. Step 1: Handling Q1 (Star Rating & CSAT Sentiment)
  if (s.step === 1) {
    let rating = 5;
    if (replyId === SURVEY_IDS.q1_5 || /5|excellent|అద్భుతం|उत्कृष्ट/i.test(text)) rating = 5;
    else if (replyId === SURVEY_IDS.q1_4 || /4|good|బాగుంది|अच्छी/i.test(text)) rating = 4;
    else if (replyId === SURVEY_IDS.q1_3 || /3|average|పర్వాలేదు|सामान्य|ठीक/i.test(text)) rating = 3;
    else if (replyId === SURVEY_IDS.q1_2 || /2|needs work|మెరుగు|सुधार/i.test(text)) rating = 2;
    else if (replyId === SURVEY_IDS.q1_1 || /1|poor|ఉపయోగపడలేదు|उपयोगी नहीं/i.test(text)) rating = 1;

    s.answers.rating = rating;
    s.step = 2;

    // Smart CSAT Surveillance Branching:
    // Rating 4-5 -> Delighted (CSAT Helpful) -> Branch to Core Service evaluated
    // Rating 1-3 -> Constructive (CSAT Needs Info) -> Branch to Improvement Drivers / Reasons
    if (rating >= 4) {
      s.answers.branch = 'service';
      s.answers.kind = 'helpful';
      return { handled: true, prompt: surveyQ2ServicePrompt(locale) };
    } else {
      s.answers.branch = 'improve';
      s.answers.kind = 'needMore';
      return { handled: true, prompt: surveyQ2ImprovePrompt(locale) };
    }
  }

  // 4. Step 2: Handling Q2 (Core Service OR Improvement Driver)
  if (s.step === 2) {
    if (s.answers.branch === 'service') {
      let service = 'Hydration Advisory';
      if (
        replyId === SURVEY_IDS.q2ServiceTriage ||
        replyId === 'surv_q3_triage' ||
        /triage|symptom|pain|లక్షణాలు|लक्षण/i.test(text)
      ) {
        service = 'Clinical Triage';
      } else if (
        replyId === SURVEY_IDS.q2ServiceHospital ||
        replyId === 'surv_q3_hospital' ||
        /hospital|labour|bed|ఆసుపత్రి|अस्पताल/i.test(text)
      ) {
        service = 'Hospital Routing';
      } else if (
        replyId === SURVEY_IDS.q2ServiceClimate ||
        replyId === 'surv_q3_weather' ||
        /weather|heat|aqi|వాతావరణం|मौसम/i.test(text)
      ) {
        service = 'Daily Climate Brief';
      } else if (
        replyId === SURVEY_IDS.q2ServiceOther ||
        replyId === 'surv_q3_other' ||
        /other|ఇతర|अन्य/i.test(text)
      ) {
        service = 'Clinical Triage';
      }
      s.answers.service = service;
    } else {
      // Branch: improve (Maps to Dashboard Negative Feedback Reasons)
      let reason = 'unclear_advice';
      let defaultService = 'Clinical Triage';
      if (replyId === SURVEY_IDS.q2ReasonLocation || /location|gps|weather|లొకేషన్|स्थान|मौसम/i.test(text)) {
        reason = 'wrong_location';
        defaultService = 'Daily Climate Brief';
      } else if (replyId === SURVEY_IDS.q2ReasonHospital || /hospital|bed|labour|ఆసుపత్రి|अस्पताल/i.test(text)) {
        reason = 'hospital_info';
        defaultService = 'Hospital Routing';
      } else if (replyId === SURVEY_IDS.q2ReasonLanguage || /language|words|jargon|భాష|भाषा/i.test(text)) {
        reason = 'wrong_language';
      } else if (replyId === SURVEY_IDS.q2ReasonSlow || /slow|fast|latency|వేగం|तेज/i.test(text)) {
        reason = 'too_slow';
      } else if (replyId === SURVEY_IDS.q2ReasonOther || /other|ఇతర|अन्य/i.test(text)) {
        reason = 'other';
      }
      s.answers.reason = reason;
      s.answers.service = s.answers.service || defaultService;
    }

    s.step = 3;
    return { handled: true, prompt: surveyQ3ClarityPrompt(locale) };
  }

  // 5. Step 3: Handling Q3 (Language Comprehension & Finalization)
  if (s.step === 3) {
    let clarity = 'very_clear';
    if (
      replyId === SURVEY_IDS.q3Clear ||
      replyId === 'surv_q2_clear' ||
      /clear|simple|స్పష్ట|सरल/i.test(text)
    ) {
      clarity = 'very_clear';
    } else if (
      replyId === SURVEY_IDS.q3Mostly ||
      replyId === 'surv_q2_mostly' ||
      /mostly|దాదాపు|ज्यादातर/i.test(text)
    ) {
      clarity = 'mostly_clear';
    } else if (
      replyId === SURVEY_IDS.q3Hard ||
      replyId === 'surv_q2_hard' ||
      /hard|jargon|కష్టం|कठिन/i.test(text)
    ) {
      clarity = 'terms_hard';
    } else if (
      replyId === SURVEY_IDS.q3Lang ||
      replyId === 'surv_q2_lang' ||
      /translat|language|అనువాదం|सुधार/i.test(text)
    ) {
      clarity = 'lang_needs_work';
    }

    s.answers.clarity = clarity;
    s.completed = true;
    s.completedAt = Date.now();
    session.survey = null; // Reset survey state so user can continue regular chat

    const rating = s.answers.rating || 5;
    const kind = rating >= 4 ? 'helpful' : 'needMore';
    const reason = s.answers.reason || null;
    const service = s.answers.service || 'Clinical Triage';

    const clarityLabel =
      clarity === 'very_clear'
        ? 'Very Clear'
        : clarity === 'mostly_clear'
        ? 'Mostly Clear'
        : clarity === 'terms_hard'
        ? 'Medical Jargon'
        : 'Translation Issue';

    const comment =
      kind === 'helpful'
        ? `Survey: ${rating}⭐ (${service}) | Clarity: ${clarityLabel}`
        : `Survey: ${rating}⭐ Needs Info (Driver: ${reason}) | Clarity: ${clarityLabel}`;

    const surveyData = {
      rating,
      kind,
      reason,
      service,
      clarity,
      locale,
      cohort: session.profile?.subjectType === 'pregnant_person'
        ? (session.profile?.pregnancyTrimester
            ? (String(session.profile.pregnancyTrimester).includes('Trimester')
                ? session.profile.pregnancyTrimester
                : `${session.profile.pregnancyTrimester} Trimester`)
            : '3rd Trimester')
        : session.profile?.subjectType === 'infant' || session.profile?.subjectType === 'child'
        ? 'Infants & Pediatric'
        : 'General Community',
      comment,
    };

    return {
      handled: true,
      completed: true,
      surveyData,
      prompt: surveyCompletePrompt(locale),
    };
  }

  return { handled: false };
}

/**
 * Dispatches the MCQ Feedback Survey invite to a specific user.
 *
 * @param {object} params
 * @param {string} params.waId
 * @param {object} params.store
 * @param {object} params.cloudApi
 * @param {boolean} [params.force=false]
 * @returns {Promise<{ success: boolean, waId: string, error?: string, windowOpen?: boolean }>}
 */
export async function sendFeedbackSurveyToUser({ waId, store, cloudApi, force = false }) {
  try {
    const session = await store.getSession(waId);
    if (!session || !session.consent?.granted) {
      return { success: false, waId, error: 'User not consented or session not found' };
    }

    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    if (!force && session.surveyLastSentAt && (Date.now() - session.surveyLastSentAt < SEVEN_DAYS_MS)) {
      return { success: false, waId, error: 'Survey already sent recently' };
    }

    const locale = session.profile?.locale || 'en';
    const invite = surveyInvitePrompt(locale);
    const windowOpen = Store.isWindowOpen(session);

    let sendRes;
    if (windowOpen) {
      sendRes = await cloudApi.sendButtons(waId, {
        body: invite.body,
        buttons: invite.buttons,
      });
    } else {
      const template = process.env.META_SURVEY_TEMPLATE;
      if (template) {
        sendRes = await cloudApi.sendTemplate(waId, {
          name: template,
          languageCode: locale,
        });
      } else {
        sendRes = await cloudApi.sendButtons(waId, {
          body: invite.body,
          buttons: invite.buttons,
        });
      }
    }

    if (sendRes && sendRes.ok === false) {
      return { success: false, waId, error: sendRes.reason || 'Send failed', windowOpen };
    }

    session.surveyLastSentAt = Date.now();
    await store.saveSession(waId, session);

    return { success: true, waId, windowOpen };
  } catch (err) {
    return { success: false, waId, error: err.message };
  }
}

/**
 * Broadcasts feedback survey invite to all active consented users.
 *
 * @param {object} params
 * @param {object} params.store
 * @param {object} params.cloudApi
 * @param {boolean} [params.force=false]
 * @returns {Promise<{ totalUsers: number, sentCount: number, failedCount: number, results: Array }>}
 */
export async function sendFeedbackSurveyToAllUsers({ store, cloudApi, force = false }) {
  const activeUsers = await store.getActiveUsers();
  const results = [];
  let sentCount = 0;
  let failedCount = 0;

  for (const waId of activeUsers) {
    const res = await sendFeedbackSurveyToUser({ waId, store, cloudApi, force });
    results.push(res);
    if (res.success) {
      sentCount++;
    } else {
      failedCount++;
    }
  }

  return {
    totalUsers: activeUsers.length,
    sentCount,
    failedCount,
    results,
  };
}
