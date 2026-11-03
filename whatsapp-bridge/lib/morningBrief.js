/**
 * Morning Brief: Proactive daily climate & health briefing.
 *
 * Runs daily at 07:00 IST (01:30 UTC).
 * For each active consented user with a location:
 *  - Checks real-time weather & air quality forecast
 *  - Tailors advice to their specific subject (baby / child / pregnancy / adult)
 *  - Delivers in their language (English / Telugu / Hindi)
 *  - Prevents duplicate sends per calendar day
 */

import { Store } from './store.js';
import { logger } from './logger.js';
import { compose24HourWeatherChangeAdvice } from './actionAdvisor.js';

let _schedulerInterval = null;

/**
 * Detects if a message is requesting to subscribe or unsubscribe from daily forecast briefings.
 * @param {string} text
 * @returns {'subscribe'|'unsubscribe'|null}
 */
export function isDailyForecastSubscriptionQuery(text) {
  if (!text || typeof text !== 'string') return null;
  const q = text.toLowerCase().trim();

  // Opt-out requests
  if (
    q.includes('stop daily') ||
    q.includes('stop forecast') ||
    q.includes('unsubscribe daily') ||
    q.includes('cancel daily') ||
    q.includes('రోజూ వద్దు') ||
    q.includes('రోజువారీ వద్దు') ||
    q.includes('రోజువారి వద్దు') ||
    q.includes('रोजाना बंद') ||
    q.includes('தினசரி வேண்டாம்') ||
    q.includes('வானிலை வேண்டாம்') ||
    q.includes('ದೈನಂದಿನ ಬೇಡ') ||
    q.includes('ಹವಾಮಾನ ಬೇಡ') ||
    q.includes('ദിവസേന വേണ്ട') ||
    q.includes('കാലാവസ്ഥ വേണ്ട') ||
    q.includes('रोज नको') ||
    q.includes('हवामान नको') ||
    q.includes('দৈনিক বন্ধ') ||
    q.includes('আবহাওয়া লাগবে না')
  ) {
    return 'unsubscribe';
  }

  // Opt-in requests
  if (
    q.includes('daily forecast') ||
    q.includes('forecast everyday') ||
    q.includes('forecast every day') ||
    q.includes('weather everyday') ||
    q.includes('weather every day') ||
    q.includes('send daily') ||
    q.includes('subscribe daily') ||
    q.includes('start daily') ||
    q.includes('రోజువారీ వాతావరణం') ||
    q.includes('రోజూ వాతావరణం') ||
    q.includes('రోజూ పంపండి') ||
    q.includes('రోజు వాతావరణం') ||
    q.includes('రోజువారీ అంచనా') ||
    q.includes('रोजाना मौसम') ||
    q.includes('रोज मौसम भेजो') ||
    q.includes('रोजाना अपडेट') ||
    q.includes('रोजाना पूर्वानुमान') ||
    q.includes('தினசரி வானிலை') ||
    q.includes('தினமும் வானிலை') ||
    q.includes('தினசரி அப்டேட்') ||
    q.includes('ದೈನಂದಿನ ಹವಾಮಾನ') ||
    q.includes('ಪ್ರತಿದಿನ ಹವಾಮಾನ') ||
    q.includes('ದಿನ ನಿತ್ಯ ಅಪ್ಡೇಟ್') ||
    q.includes('ദിവസേന കാലാവസ്ഥ') ||
    q.includes('ദിവസവും കാലാവസ്ഥ') ||
    q.includes('ഡെയ്ലി അപ്ഡേറ്റ്') ||
    q.includes('दैनंदिन हवामान') ||
    q.includes('रोजचे हवामान') ||
    q.includes('रोज हवामान पाठवा') ||
    q.includes('দৈনিক আবহাওয়া') ||
    q.includes('প্রতিদিনের আবহাওয়া') ||
    q.includes('প্রতিদিন আপডেট')
  ) {
    return 'subscribe';
  }

  return null;
}

/**
 * The one piece of climate-aware advice that matters most for this profile.
 *
 * Shared by the morning brief and the tip sent the moment onboarding
 * finishes, so a user never gets two differently-worded versions of the same
 * guidance.
 *
 * @param {object} profile
 * @param {'en'|'te'|'hi'|'ar'} locale
 * @returns {string}
 */
export function subjectTip(profile = {}, locale = 'en') {
  const tips = {
    te: {
      infant:
        'శిశువుకు పలచని కాటన్ బట్టలు వేయండి మరియు తరచుగా తల్లిపాలు ఇవ్వండి (6 నెలల లోపు నీరు ఇవ్వవద్దు).',
      child: 'పిల్లలు ఆడుకునేటప్పుడు నీడ ఉన్న ప్రదేశాలను ఎంచుకోండి.',
      pregnant_person:
        'మధ్యాహ్నం 12-4 గంటల మధ్య ప్రత్యక్ష ఎండలో తిరగవద్దు మరియు కొబ్బరి నీరు లేదా మజ్జిగ తీసుకోండి.',
      default: 'రోజంతా తగినంత మంచినీరు తాగుతూ శరీరాన్ని హైడ్రేట్ గా ఉంచుకోండి.',
    },
    hi: {
      infant:
        'शिशु को हल्के सूती कपड़े पहनाएं और नियमित स्तनपान कराएं (6 माह से कम उम्र में सादा पानी न दें)।',
      child: 'बच्चों को धूप में खेलने से रोकें और छायादार स्थान में रखें।',
      pregnant_person: 'दोपहर 12 से 4 बजे के बीच कड़ी धूप से बचें और तरल पदार्थों का सेवन करें।',
      default: 'दिनभर पर्याप्त पानी पिएं और खुद को हाइड्रेटेड रखें।',
    },
    ta: {
      infant:
        'குழந்தைக்கு மெல்லிய பருத்தி ஆடைகளை அணிவிக்கவும் மற்றும் அடிக்கடி தாய்ப்பால் கொடுக்கவும் (6 மாதத்திற்கு உட்பட்ட குழந்தைகளுக்கு தண்ணீர் தர வேண்டாம்).',
      child: 'குழந்தைகள் வெளியில் விளையாடும்போது நிழலான இடங்களை தேர்வு செய்யவும்.',
      pregnant_person:
        'மதியம் 12-4 மணி வரை நேரடி வெயிலைத் தவிர்க்கவும், இளநீர் அல்லது மோர் அருந்தவும்.',
      default: 'நன்றாக நீர் அருந்தி உடலை நீரேற்றத்துடன் வைத்திருக்கவும்.',
    },
    kn: {
      infant:
        'ಮಗುವಿಗೆ ತಿಳಿ ಹತ್ತಿ ಬಟ್ಟೆಗಳನ್ನು ತೊಡಿಸಿ ಮತ್ತು ಆಗಾಗ ಎದೆಹಾಲು ನೀಡಿ (6 ತಿಂಗಳ ಒಳಗಿನ ಮಗುವಿಗೆ ಸಾದಾ ನೀರು ನೀಡಬೇಡಿ).',
      child: 'ಮಕ್ಕಳು ಹೊರಾಂಗಣದಲ್ಲಿ ಆಡುವಾಗ ನೆರಳಿನ ಸ್ಥಳಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ.',
      pregnant_person:
        'ಮಧ್ಯಾಹ್ನ 12 ರಿಂದ 4 ರವರೆಗೆ ನೇರ ಬಿಸಿಲನ್ನು ತಪ್ಪಿಸಿ ಮತ್ತು ಎಳನೀರು ಅಥವಾ ಮಜ್ಜಿಗೆ ಸೇವಿಸಿ.',
      default: 'ದಿನವಿಡೀ ಸಾಕಷ್ಟು ನೀರು ಕುಡಿದು ದೇಹವನ್ನು ಹೈಡ್ರೇಟ್ ಆಗಿರಿಸಿಕೊಳ್ಳಿ.',
    },
    ml: {
      infant:
        'കുഞ്ഞിന് നേർത്ത കോട്ടൺ വസ്ത്രങ്ങൾ ധരിപ്പിക്കുക, ആവശ്യത്തിന് മുലപ്പാൽ നൽകുക (6 മാസത്തിൽ താഴെയുള്ള കുഞ്ഞുങ്ങൾക്ക് വെള്ളം നൽകരുത്).',
      child: 'കുട്ടികൾ പുറത്ത് കളിക്കുമ്പോൾ തണലുള്ള സ്ഥലങ്ങൾ തിരഞ്ഞെടുക്കുക.',
      pregnant_person:
        'ഉച്ചയ്ക്ക് 12 മുതൽ 4 വരെ നേരിട്ടുള്ള വെയിൽ ഒഴിവാക്കുക, കരിക്കിൻ വെള്ളമോ മോരോ കുടിക്കുക.',
      default: 'ധാരാളം വെള്ളം കുടിച്ച് ശരീരത്തിലെ ജലാംശം നിലനിർത്തുക.',
    },
    mr: {
      infant:
        'बाळाला सुती कपडे घाला आणि वारंवार स्तनपान द्या (६ महिन्यांपेक्षा कमी वयाच्या बाळाला साधे पाणी देऊ नका).',
      child: 'मुले खेळताना सावलीच्या जागा निवडा.',
      pregnant_person:
        'दुपारी १२ ते ४ दरम्यान कडक ऊन टाळा आणि नारळ पाणी किंवा ताक घ्या.',
      default: 'दिवसभर भरपूर पाणी पिऊन स्वतःला हायड्रेटेड ठेवा.',
    },
    bn: {
      infant:
        'শিশুকে পাতলা সুতির পোশাক পরান এবং ঘন ঘন বুকের দুধ খাওয়ান (৬ মাসের কম বয়সী শিশুকে সাধারণ পানি দেবেন না)।',
      child: 'বাচ্চাদের ছায়াযুক্ত জায়গায় খেলতে দিন।',
      pregnant_person:
        'দুপুর ১২টা থেকে ৪টার মধ্যে সরাসরি রোদে যাওয়া এড়িয়ে চলুন এবং ডাবের পানি বা ঘোল খান।',
      default: 'সারাদিন পর্যাপ্ত নিরাপদ পানি পান করুন এবং হাইড্রেটেড থাকুন।',
    },
    en: {
      infant:
        'Dress baby in light, breathable cotton and offer frequent breastfeeds (no plain water under 6 months).',
      child: 'Keep outdoor playtime in shaded areas and carry a water bottle.',
      pregnant_person:
        'Avoid direct sun exposure between 12–4 PM and keep water or tender coconut water handy.',
      default: 'Stay hydrated and drink plenty of fluids throughout the day.',
    },
  };
  const row = tips[locale] || tips.en;
  return row[profile.subjectType] || row.default;
}

/**
 * The first tip, sent right after onboarding completes.
 *
 * Same climate intelligence as the morning brief, framed as a welcome rather
 * than a daily digest — so the very first thing a new user gets is something
 * useful about where they actually are, not another setup message.
 *
 * @param {object} session
 * @param {object|null} climate
 * @returns {string}
 */
export function composeFirstTip(session, climate) {
  const profile = session.profile || {};
  const locale = profile.locale || 'en';
  const cityName = profile.location?.name || climate?.cityName || null;
  const temp = climate?.temperature;
  const feelsLike = climate?.feelsLike ?? temp;
  const tip = subjectTip(profile, locale);
  const hasWeather = typeof temp === 'number';

  if (locale === 'te') {
    const where = cityName ? `📍 ${cityName}` : '📍 మీ ప్రాంతం';
    const line = hasWeather
      ? `${where}: ప్రస్తుతం ${temp}°C (అనిపించేది: ${feelsLike}°C)\n\n`
      : '';
    return `${line}💡 మీ మొదటి సూచన:\n${tip}`;
  }

  if (locale === 'hi') {
    const where = cityName ? `📍 ${cityName}` : '📍 आपका क्षेत्र';
    const line = hasWeather ? `${where}: अभी ${temp}°C (अनुभव: ${feelsLike}°C)\n\n` : '';
    return `${line}💡 आपकी पहली सलाह:\n${tip}`;
  }

  if (locale === 'ta') {
    const where = cityName ? `📍 ${cityName}` : '📍 உங்கள் பகுதி';
    const line = hasWeather ? `${where}: தற்போது ${temp}°C (உணரப்படுவது: ${feelsLike}°C)\n\n` : '';
    return `${line}💡 உங்கள் முதல் ஆலோசனை:\n${tip}`;
  }

  if (locale === 'kn') {
    const where = cityName ? `📍 ${cityName}` : '📍 ನಿಮ್ಮ ಪ್ರದೇಶ';
    const line = hasWeather ? `${where}: ಪ್ರಸ್ತುತ ${temp}°C (ಅನಿಸುವುದು: ${feelsLike}°C)\n\n` : '';
    return `${line}💡 ನಿಮ್ಮ ಮೊದಲ ಸಲಹೆ:\n${tip}`;
  }

  if (locale === 'ml') {
    const where = cityName ? `📍 ${cityName}` : '📍 നിങ്ങളുടെ പ്രദേശം';
    const line = hasWeather ? `${where}: നിലവിൽ ${temp}°C (അനുഭവപ്പെടുന്നത്: ${feelsLike}°C)\n\n` : '';
    return `${line}💡 നിങ്ങളുടെ ആദ്യ നിർദ്ദേശം:\n${tip}`;
  }

  if (locale === 'mr') {
    const where = cityName ? `📍 ${cityName}` : '📍 आपला परिसर';
    const line = hasWeather ? `${where}: सध्या ${temp}°C (भासणारा: ${feelsLike}°C)\n\n` : '';
    return `${line}💡 आपला पहिला सल्ला:\n${tip}`;
  }

  if (locale === 'bn') {
    const where = cityName ? `📍 ${cityName}` : '📍 আপনার এলাকা';
    const line = hasWeather ? `${where}: বর্তমানে ${temp}°C (অনুভূত: ${feelsLike}°C)\n\n` : '';
    return `${line}💡 আপনার প্রথম পরামর্শ:\n${tip}`;
  }

  const where = cityName ? `📍 ${cityName}` : '📍 Your area';
  const line = hasWeather ? `${where}: ${temp}°C right now (feels like ${feelsLike}°C)\n\n` : '';
  return `${line}💡 Your first tip:\n${tip}`;
}

/**
 * Compose a tailored morning briefing message.
 * @param {object} session
 * @param {object} climate
 * @returns {string}
 */
export function composeMorningBrief(session, climate) {
  const profile = session.profile || {};
  const locale = profile.locale || 'en';
  const name = profile.name ? profile.name : '';
  const greetingName = name ? `, ${name}` : '';
  const cityName = profile.location?.name || climate?.cityName || 'your area';

  // If a full 24-hour climate forecast is available, provide full 24-hour prediction & recommended actions
  if (climate?.forecast?.shifts) {
    const greeting = locale === 'te'
      ? `శుభోదయం${greetingName}! ☀️ నేటి 24 గంటల వాతావరణ అంచనా మరియు ఆరోగ్య జాగ్రత్తలు:\n\n`
      : locale === 'hi'
      ? `शुभ प्रभात${greetingName}! ☀️ आज का 24 घंटे का मौसम पूर्वानुमान और स्वास्थ्य सलाह:\n\n`
      : `Good morning${greetingName}! ☀️ Here is your daily 24-hour weather prediction and health guidance:\n\n`;

    const advice = compose24HourWeatherChangeAdvice(climate.forecast, profile, 'daily morning forecast');
    return `${greeting}${advice}`;
  }

  const temp = climate?.temperature ?? '28';
  const feelsLike = climate?.feelsLike ?? temp;
  const aqi = climate?.aqi ?? 'Good';
  const uv = climate?.uvIndex ?? '4';

  if (locale === 'te') {
    const tip = subjectTip(profile, 'te');

    return (
      `శుభోదయం${greetingName}! ☀️\n\n` +
      `📍 *${cityName} నేటి వాతావరణం:*\n` +
      `• ఉష్ణోగ్రత: ${temp}°C (అనిపించేది: ${feelsLike}°C)\n` +
      `• గాలి నాణ్యత (AQI): ${aqi} | UV సూచిక: ${uv}/11\n\n` +
      `💡 *నేటి ఆరోగ్య సూచన:*\n${tip}\n\n` +
      `మంచి రోజు కావాలని కోరుకుంటున్నాం! 🌸`
    );
  }

  if (locale === 'hi') {
    const tip = subjectTip(profile, 'hi');

    return (
      `शुभ प्रभात${greetingName}! ☀️\n\n` +
      `📍 *${cityName} का आज का मौसम:*\n` +
      `• तापमान: ${temp}°C (अनुभव: ${feelsLike}°C)\n` +
      `• वायु गुणवत्ता (AQI): ${aqi} | UV इंडेक्स: ${uv}/11\n\n` +
      `💡 *आज की स्वास्थ्य सलाह:*\n${tip}\n\n` +
      `आपका दिन शुभ और स्वस्थ रहे! 🌸`
    );
  }

  // Default English
  const tip = subjectTip(profile, 'en');

  return (
    `Good morning${greetingName}! ☀️\n\n` +
    `📍 *Today in ${cityName}:*\n` +
    `• High of ${temp}°C (feels like ${feelsLike}°C)\n` +
    `• Air Quality: ${aqi} | UV Index: ${uv}/11\n\n` +
    `💡 *Tip for today:*\n${tip}\n\n` +
    `Wishing you a healthy day ahead! 🌸`
  );
}

/**
 * Send morning brief to a single user.
 */
export async function sendMorningBriefToUser({ waId, store, cloudApi, fetchClimateIntelligence }) {
  try {
    const session = await store.getSession(waId);
    if (!session?.consent?.granted) return false;

    // Check if user has explicitly opted out of daily forecast
    if (session.profile?.dailyForecastOptIn === false) return false;

    // Check if already sent today (IST date YYYY-MM-DD)
    const todayIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (session.lastMorningBriefDate === todayIST) return false;

    let lat = session.profile?.location?.latitude;
    let lon = session.profile?.location?.longitude;
    const cityName = session.profile?.location?.name || 'Hyderabad';

    // If no coordinates stored, default to Hyderabad coordinates
    if (!lat || !lon) {
      lat = 17.385;
      lon = 78.4867;
    }

    const climate = await fetchClimateIntelligence(lat, lon, cityName);
    const briefText = composeMorningBrief(session, climate);

    // If customer window is open, send text
    if (Store.isWindowOpen(session)) {
      await cloudApi.sendText(waId, briefText);
    } else {
      // If template is configured, send template
      const template = process.env.META_MORNING_TEMPLATE;
      if (template) {
        await cloudApi.sendTemplate(waId, {
          name: template,
          languageCode: session.profile?.locale || 'en',
        });
      } else {
        // Direct text send fallback
        await cloudApi.sendText(waId, briefText);
      }
    }

    // Record delivery date
    session.lastMorningBriefDate = todayIST;
    await store.saveSession(waId, session);
    logger.info(`[DAILY FORECAST BRIEF] Sent to ${waId} for ${todayIST}`);
    return true;
  } catch (err) {
    logger.error(`[DAILY FORECAST BRIEF] Error sending to ${waId}:`, { error: err.message });
    return false;
  }
}

/**
 * Daily runner: checks if current IST time is in morning window (07:00 - 08:00 IST)
 * Can also be triggered forcefully (e.g. for testing or ops trigger).
 */
export async function runMorningBriefs({ store, cloudApi, fetchClimateIntelligence, force = false }) {
  const istDate = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const hour = istDate.getUTCHours();

  // Run in 07:00 IST hour or when force = true
  if (hour === 7 || force) {
    const activeUsers = await store.getActiveUsers();
    let sentCount = 0;
    for (const waId of activeUsers) {
      const sent = await sendMorningBriefToUser({ waId, store, cloudApi, fetchClimateIntelligence });
      if (sent) sentCount++;
    }
    return { ran: true, totalUsers: activeUsers.length, sentCount };
  }
  return { ran: false, hourIST: hour };
}

/**
 * Start background scheduler for morning briefings (checks every 10 minutes).
 */
export function startMorningBriefScheduler({ store, cloudApi, fetchClimateIntelligence }) {
  if (_schedulerInterval) clearInterval(_schedulerInterval);

  _schedulerInterval = setInterval(() => {
    runMorningBriefs({ store, cloudApi, fetchClimateIntelligence }).catch((err) => {
      logger.error('[MORNING BRIEF SCHEDULER] Error:', { error: err.message });
    });
  }, 10 * 60 * 1000);

  logger.info('☀️ [MORNING BRIEF] Scheduler initialized (Daily at 07:00 IST)');
}

export function stopMorningBriefScheduler() {
  if (_schedulerInterval) {
    clearInterval(_schedulerInterval);
    _schedulerInterval = null;
  }
}
