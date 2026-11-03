/**
 * lib/actionAdvisor.js
 *
 * Deterministic Clinical Action Advisor for 5-Day Weather Outlooks.
 * Evaluates multi-day temperature trends, heatwave streaks, and precipitation risks,
 * producing tailored recommendations for vulnerable groups (infants, pregnancy, children).
 * Supports English, Telugu, and Hindi.
 */

const LOCALIZED_HEADERS = {
  en: {
    title: '5-Day Climate Health Outlook',
    streakAlert: '⚠️ Heatwave Warning: Prolonged extreme heat expected over the next 5 days.',
    actionsTitle: 'Recommended Actions for',
    disclaimer: 'Guidance only, not a medical diagnosis. For health emergencies, call 112.',
  },
  te: {
    title: '5-రోజుల వాతావరణ మరియు ఆరోగ్య సూచనలు',
    streakAlert: '⚠️ తీవ్రమైన ఎండ హెచ్చరిక: రాబోయే 5 రోజుల్లో వరుసగా తీవ్ర ఉష్ణోగ్రతలు నమోదయ్యే అవకాశం ఉంది.',
    actionsTitle: 'తీసుకోవలసిన ముఖ్య జాగ్రత్తలు',
    disclaimer: 'ఇది సాధారణ సూచన మాత్రమే. అత్యవసర పరిస్థితుల్లో 112 కు కాల్ చేయండి.',
  },
  hi: {
    title: '5-दिवसीय मौसम एवं स्वास्थ्य मार्गदर्शन',
    streakAlert: '⚠️ लू (हीटवेव) की चेतावनी: अगले 5 दिनों में लगातार अत्यधिक गर्मी की संभावना है।',
    actionsTitle: 'आवश्यक सुरक्षा कदम',
    disclaimer: 'यह केवल सामान्य सलाह है। आपात स्थिति में 112 पर कॉल करें।',
  },
};

/**
 * Returns specific protective actions based on subject type and risk level.
 *
 * @param {string} subjectType - infant | pregnant_person | child | adult
 * @param {string} highestRisk - extreme | high | caution | normal
 * @param {boolean} hasRain - whether rain is expected in the 5-day window
 * @param {'en'|'te'|'hi'} locale
 * @returns {string[]}
 */
export function getSubjectActions(subjectType = 'adult', highestRisk = 'normal', hasRain = false, locale = 'en') {
  const actions = {
    en: {
      infant: [
        'Offer frequent breastfeeds/formula to maintain hydration. Do NOT give plain water under 6 months.',
        'Dress your baby in a single layer of loose, breathable cotton.',
        'Keep the baby indoors away from direct heat between 11:00 AM and 5:00 PM.',
        ...(hasRain ? ['Check for stagnant water around the home to prevent mosquito breeding.'] : []),
      ],
      pregnant_person: [
        'Drink plenty of fluids throughout the day: tender coconut water, buttermilk, or lemon water.',
        'Avoid outdoor travel or direct sun exposure between 12:00 PM and 4:00 PM.',
        'Rest in well-ventilated, shaded rooms; elevate feet if experiencing heat swelling.',
        ...(highestRisk === 'extreme' ? ['Seek immediate medical care if experiencing dizziness, nausea, or rapid heartbeat.'] : []),
      ],
      child: [
        'Ensure outdoor playtime happens only before 10:00 AM or after 5:00 PM.',
        'Keep an easy-access water bottle nearby and encourage water breaks every 30 minutes.',
        'Wear wide-brimmed hats and light-colored cotton clothing outdoors.',
        ...(hasRain ? ['Apply mosquito repellent or dress in full-length cotton sleeves.'] : []),
      ],
      adult: [
        'Drink at least 2.5–3 liters of water daily, even if not feeling thirsty.',
        'Avoid strenuous outdoor work or physical exertion during peak afternoon hours (12–4 PM).',
        'Keep living spaces cool using window curtains and adequate airflow.',
      ],
    },
    te: {
      infant: [
        'శిశువుకు తరచుగా తల్లిపాలు ఇవ్వండి. 6 నెలల లోపు వయస్సు ఉన్నవారికి ఎట్టి పరిస్థితుల్లోనూ మంచినీరు ఇవ్వవద్దు.',
        'శిశువుకు పలచని కాటన్ బట్టలు వేయండి.',
        'ఉదయం 11 నుండి సాయంత్రం 5 గంటల వరకు శిశువును బయటకు తీసుకురావద్దు.',
      ],
      pregnant_person: [
        'రోజంతా తగినంత కొబ్బరి నీరు, మజ్జిగ లేదా నీరు తాగుతూ హైడ్రేటెడ్ గా ఉండండి.',
        'మధ్యాహ్నం 12 నుండి 4 గంటల మధ్య ప్రత్యక్ష ఎండలో తిరగవద్దు.',
        'నీడ ఉన్న చల్లని ప్రదేశంలో విశ్రాంతి తీసుకోండి.',
      ],
      child: [
        'పిల్లలను ఎండలో కాకుండా ఉదయం లేదా సాయంత్రం వేళల్లో మాత్రమే ఆడుకోనివ్వండి.',
        'ప్రతి 30 నిమిషాలకు ఒకసారి మంచినీరు తాగించండి.',
      ],
      adult: [
        'రోజూ కనీసం 2.5 నుండి 3 లీటర్ల నీరు తాగండి.',
        'మధ్యాహ్నం తీవ్రమైన శారీరక శ్రమను తగ్గించండి.',
      ],
    },
    hi: {
      infant: [
        'शिशु को बार-बार स्तनपान कराएं। 6 माह से कम उम्र के शिशु को सादा पानी बिल्कुल न दें।',
        'शिशु को हल्के सूती कपड़े पहनाएं।',
        'सुबह 11 से शाम 5 बजे के बीच धूप और गर्मी से दूर रखें।',
      ],
      pregnant_person: [
        'पर्याप्त तरल पदार्थ पिएं: नारियल पानी, छाछ और नींबू पानी का सेवन करें।',
        'दोपहर 12 से 4 बजे के बीच कड़ी धूप में बाहर जाने से बचें।',
        'हवादार और ठंडे स्थान पर आराम करें।',
      ],
      child: [
        'बच्चों को दोपहर की धूप में बाहर न खेलने दें।',
        'समय-समय पर पानी पिलाते रहें और ओआरएस/तरल पदार्थ दें।',
      ],
      adult: [
        'दिनभर में पर्याप्त मात्रा में पानी पिएं।',
        'दोपहर के समय भारी शारीरिक परिश्रम से बचें।',
      ],
    },
  };

  const loc = actions[locale] || actions.en;
  return loc[subjectType] || loc.adult;
}

/**
 * Generates a complete 5-day WhatsApp outlook message.
 *
 * @param {object} forecast5d - Output from fetch5DayForecast
 * @param {object} profile - Session profile (locale, subjectType, childAgeMonths)
 * @returns {string} WhatsApp-ready plain text
 */
export function compose5DayOutlook(forecast5d, profile = {}) {
  if (!forecast5d || !forecast5d.days || forecast5d.days.length === 0) {
    return '5-day forecast data is currently unavailable for your area. Please check back shortly.';
  }

  const locale = profile.locale || 'en';
  const subjectType = profile.subjectType || 'adult';
  const headers = LOCALIZED_HEADERS[locale] || LOCALIZED_HEADERS.en;

  const highestRisk = forecast5d.days.some((d) => d.riskLevel === 'extreme')
    ? 'extreme'
    : forecast5d.days.some((d) => d.riskLevel === 'high')
    ? 'high'
    : forecast5d.days.some((d) => d.riskLevel === 'caution')
    ? 'caution'
    : 'normal';

  const hasRain = forecast5d.days.some((d) => d.rainProb >= 40);

  const parts = [];

  // Header
  const sourceLabel = forecast5d.isAuroraCovered
    ? '📍 ' + forecast5d.cityName + ' (Microsoft Aurora 0.25° + Open-Meteo)'
    : '📍 ' + forecast5d.cityName;

  parts.push(`🗓️ ${headers.title}\n${sourceLabel}`);

  // Heatwave streak banner
  if (forecast5d.hasHeatwaveStreak) {
    parts.push(headers.streakAlert);
  }

  // Daily summary list
  const dayRows = forecast5d.days.map((d) => {
    let icon = '☀️';
    if (d.riskLevel === 'extreme') icon = '🚨';
    else if (d.riskLevel === 'high') icon = '⚠️';
    else if (d.rainProb >= 50) icon = '🌧️';

    const rainText = d.rainProb >= 30 ? ` · Rain: ${d.rainProb}%` : '';
    return `• ${d.dayName} (${d.date.slice(5)}): ${icon} Max ${d.maxTemp}°C / Min ${d.minTemp}°C${rainText}`;
  });

  parts.push(dayRows.join('\n'));

  // Protective Actions
  const actions = getSubjectActions(subjectType, highestRisk, hasRain, locale);
  if (actions && actions.length > 0) {
    parts.push(`${headers.actionsTitle} (${subjectType.replace('_', ' ')}):\n` + actions.map((a) => `• ${a}`).join('\n'));
  }

  // Safety disclaimer
  parts.push(`_${headers.disclaimer}_`);

  return parts.join('\n\n');
}

/**
 * Composes a simple, concise, action-focused recommendation answering what the user asked about the weather.
 * Avoids spreadsheet data dumps and emphasizes 2-3 direct, protective actions.
 *
 * @param {object} forecast5d - Output from fetch5DayForecast
 * @param {object} profile - Session profile (locale, subjectType, childAgeMonths)
 * @param {string} userQuery - The user's incoming message
 * @returns {string} WhatsApp-ready plain text
 */
export function composeSimpleWeatherAdvice(forecast5d, profile = {}, userQuery = '') {
  if (!forecast5d || !forecast5d.days || forecast5d.days.length === 0) {
    const loc = profile.locale || 'en';
    if (loc === 'te') return 'ప్రస్తుతం మీ ప్రాంత వాతావరణ సమాచారం అందుబాటులో లేదు. దయచేసి కాసేపటి తర్వాత ప్రయత్నించండి.';
    if (loc === 'hi') return 'माफ़ करें, अभी आपके क्षेत्र का मौसम विवरण उपलब्ध नहीं है। कृपया थोड़ी देर बाद प्रयास करें।';
    return 'Weather forecast data is currently unavailable for your area. Please check back shortly.';
  }

  const locale = profile.locale || 'en';
  const qLower = (userQuery || '').toLowerCase();

  // Detect subject from query or session profile
  let subjectType = profile.subjectType || 'adult';
  if (qLower.includes('baby') || qLower.includes('infant') || qLower.includes('పాప') || qLower.includes('శిశువు') || qLower.includes('नवजात') || qLower.includes('शिशु')) {
    subjectType = 'infant';
  } else if (qLower.includes('pregnant') || qLower.includes('pregnancy') || qLower.includes('గర్భ') || qLower.includes('गर्भवती') || qLower.includes('गर्भ')) {
    subjectType = 'pregnant_person';
  } else if (qLower.includes('child') || qLower.includes('kid') || qLower.includes('పిల్ల') || qLower.includes('बच्च')) {
    subjectType = 'child';
  }

  // Find peak temperature and rain days
  let maxTemp = -999;
  let peakDayName = '';
  const rainyDays = [];

  for (const d of forecast5d.days) {
    if (d.maxTemp > maxTemp) {
      maxTemp = d.maxTemp;
      peakDayName = d.dayName;
    }
    if (d.rainProb >= 40) {
      rainyDays.push(d.dayName);
    }
  }

  const hasHeatwave = forecast5d.hasHeatwaveStreak || maxTemp >= 40;
  const hasRainQuery = qLower.includes('rain') || qLower.includes('వర్ష') || qLower.includes('बारिश');
  const hasRain = rainyDays.length > 0 || hasRainQuery;

  // 1. Brief weather summary (1-2 lines)
  let weatherBrief = '';
  if (locale === 'te') {
    weatherBrief = `🌡️ *వాతావరణ సూచన (${forecast5d.cityName})*:\n` +
      `రాబోయే రోజుల్లో ఉష్ణోగ్రతలు గరిష్టంగా ${maxTemp}°C వరకు చేరే అవకాశం ఉంది (${peakDayName} నాడు తీవ్ర ఎండ).` +
      (rainyDays.length ? ` ${rainyDays.slice(0, 2).join(', ')} రోజుల్లో వర్షం పడే అవకాశం ఉంది.` : '');
  } else if (locale === 'hi') {
    weatherBrief = `🌡️ *मौसम की स्थिति (${forecast5d.cityName})*:\n` +
      `आने वाले दिनों में तापमान ${maxTemp}°C तक रहेगा (${peakDayName} को सबसे अधिक गर्मी रहेगी)।` +
      (rainyDays.length ? ` ${rainyDays.slice(0, 2).join(', ')} को बारिश हो सकती है।` : '');
  } else {
    weatherBrief = `🌡️ *Upcoming Weather (${forecast5d.cityName})*:\n` +
      `Temperatures will reach highs of up to ${maxTemp}°C (peaking on ${peakDayName})` +
      (hasHeatwave ? ' with heatwave conditions' : '') +
      (rainyDays.length ? `, and showers expected around ${rainyDays.slice(0, 2).join('/')}` : '.') +
      (rainyDays.length ? '.' : '');
  }

  // 2. Action recommendations
  const highestRisk = maxTemp >= 42 ? 'extreme' : maxTemp >= 38 ? 'high' : 'caution';
  let actions = getSubjectActions(subjectType, highestRisk, hasRain, locale);

  // If user specifically asked about rain, emphasize rain safety
  if (hasRainQuery) {
    if (locale === 'te') {
      actions = [
        'బయటకు వెళ్లేటప్పుడు గొడుగు తీసుకెళ్లండి.',
        'దోమలు చేరకుండా ఇంటి పరిసరాల్లో నీరు నిల్వ ఉండకుండా చూడండి.',
        ...actions.slice(0, 1),
      ];
    } else if (locale === 'hi') {
      actions = [
        'बाहर निकलते समय छाता साथ रखें।',
        'मच्छरों से बचाव के लिए घर के आसपास पानी जमा न होने दें।',
        ...actions.slice(0, 1),
      ];
    } else {
      actions = [
        'Keep an umbrella handy on rainy days.',
        'Check around your home to clear stagnant water and prevent mosquitoes.',
        ...actions.slice(0, 1),
      ];
    }
  } else {
    actions = actions.slice(0, 3);
  }

  // 3. Formatted header and disclaimer
  const actionTitle = locale === 'te'
    ? '💡 *తీసుకోవలసిన ముఖ్య జాగ్రత్తలు*:'
    : locale === 'hi'
    ? '💡 *आवश्यक सुरक्षा कदम*:'
    : '💡 *Recommended Actions*:';

  const disclaimer = locale === 'te'
    ? '_అత్యవసర పరిస్థితుల్లో 112 కు కాల్ చేయండి._'
    : locale === 'hi'
    ? '_आपात स्थिति में 112 पर कॉल करें।_'
    : '_For emergencies, call 112._';

  return `${weatherBrief}\n\n${actionTitle}\n` + actions.map((a) => `• ${a}`).join('\n') + `\n\n${disclaimer}`;
}

function formatHour(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return String(isoStr);
  return d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

/**
 * Composes actionable advice sensing next 24-hour weather shifts in the user's location.
 * Provides time-windowed protective recommendations (morning, peak heat, evening showers, night).
 *
 * @param {object} forecast24h - Structured output from fetchAuroraForecast
 * @param {object} profile - Session profile (subjectType, locale, childAgeMonths)
 * @param {string} userQuery - The user's query
 * @returns {string} WhatsApp-formatted plain text
 */
export function compose24HourWeatherChangeAdvice(forecast24h, profile = {}, userQuery = '') {
  if (!forecast24h) {
    const loc = profile.locale || 'en';
    if (loc === 'te') return 'రాబోయే 24 గంటల వాతావరణ సమాచారం ప్రస్తుతం అందుబాటులో లేదు. దయచేసి కాసేపటి తర్వాత ప్రయత్నించండి.';
    if (loc === 'hi') return 'अगले 24 घंटों का मौसम विवरण अभी उपलब्ध नहीं है। कृपया थोड़ी देर बाद प्रयास करें।';
    return '24-hour weather shift data is currently unavailable. Please check back shortly.';
  }

  const locale = profile.locale || 'en';
  const qLower = (userQuery || '').toLowerCase();
  const cityName = forecast24h.cityName || profile.location?.name || 'your area';

  // Detect subject type from profile or query
  let subjectType = profile.subjectType || 'adult';
  if (qLower.includes('baby') || qLower.includes('infant') || qLower.includes('పాప') || qLower.includes('శిశువు') || qLower.includes('नवजात') || qLower.includes('शिशु')) {
    subjectType = 'infant';
  } else if (qLower.includes('pregnant') || qLower.includes('pregnancy') || qLower.includes('గర్భ') || qLower.includes('गर्भवती') || qLower.includes('गर्भ')) {
    subjectType = 'pregnant_person';
  } else if (qLower.includes('child') || qLower.includes('kid') || qLower.includes('పిల్ల') || qLower.includes('बच्च')) {
    subjectType = 'child';
  }

  const shifts = forecast24h.shifts || {};
  const currentTemp = shifts.current?.temperature ?? forecast24h.peaks?.temperature ?? 'N/A';
  const currentFeels = shifts.current?.feelsLike ?? forecast24h.peaks?.feelsLike ?? currentTemp;
  const maxTemp = shifts.temperature?.max ?? forecast24h.peaks?.temperature ?? 'N/A';
  const maxTempHour = shifts.temperature?.maxHour ? formatHour(shifts.temperature.maxHour) : null;
  const minTemp = shifts.temperature?.min ?? forecast24h.daily?.minTemp ?? 'N/A';
  const minTempHour = shifts.temperature?.minHour ? formatHour(shifts.temperature.minHour) : null;
  const tempSwing = shifts.temperature?.swing ?? 0;
  const tempRise = shifts.temperature?.riseFromCurrent ?? 0;

  const heatWindow = shifts.heatWindow || {};
  const hasPeakHeat = Boolean(heatWindow.hasPeakHeat && heatWindow.startHour);
  const heatStart = heatWindow.startHour ? formatHour(heatWindow.startHour) : '12:00 PM';
  const heatEnd = heatWindow.endHour ? formatHour(heatWindow.endHour) : '4:30 PM';

  const rain = shifts.rain || {};
  const rainExpected = Boolean(rain.expected);
  const rainStart = rain.startHour ? formatHour(rain.startHour) : null;
  const maxRainProb = rain.maxProb ?? 0;

  const aqi = shifts.aqi || {};
  const aqiWorsens = Boolean(aqi.worsens);
  const aqiPeakHour = aqi.peakHour ? formatHour(aqi.peakHour) : null;

  // 1. Shift Summary
  const auroraBadge = forecast24h.auroraApplied ? ' [Microsoft Aurora + Open-Meteo]' : '';
  const auroraBadgeTe = forecast24h.auroraApplied ? ' [మైక్రోసాఫ్ట్ అరోరా + ఓపెన్-మెటియో]' : '';
  const auroraBadgeHi = forecast24h.auroraApplied ? ' [माइक्रोसॉफ्ट ऑरोरा + ओपन-मेटियो]' : '';

  let shiftSummary = '';
  if (locale === 'te') {
    shiftSummary = `🌡️ *రాబోయే 24 గంటల వాతావరణ మార్పులు (${cityName})*${auroraBadgeTe}:\n`;
    shiftSummary += `• ప్రస్తుతం ఉష్ణోగ్రత ${currentTemp}°C గా ఉంది.`;
    if (maxTempHour && tempRise > 1.5) {
      shiftSummary += ` మధ్యాహ్నం ${maxTempHour} సమయానికి గరిష్టంగా ${maxTemp}°C కి పెరిగే అవకాశం ఉంది (+${tempRise}°C మార్పు).`;
    } else {
      shiftSummary += ` రాబోయే 24 గంటల్లో గరిష్ట ఉష్ణోగ్రత ${maxTemp}°C గా ఉంటుంది.`;
    }
    if (minTempHour) {
      shiftSummary += ` రాత్రి/తెల్లవారుజామున ${minTempHour} వేళకు ${minTemp}°C కి తగ్గుతుంది (మొత్తం తేడా: ${tempSwing}°C).`;
    }
    if (hasPeakHeat) {
      shiftSummary += `\n• ☀️ *ఎండ తీవ్రత:* మధ్యాహ్నం ${heatStart} నుండి ${heatEnd} వరకు అత్యధిక వేడి ఉంటుంది.`;
    }
    if (rainExpected && rainStart) {
      shiftSummary += `\n• 🌧️ *వర్షం సూచన:* సాయంత్రం సుమారు ${rainStart} నుండి వర్షం కురిసే అవకాశం ఉంది (${maxRainProb}% అవకాశం).`;
    }
  } else if (locale === 'hi') {
    shiftSummary = `🌡️ *अगले 24 घंटों में मौसम का बदलाव (${cityName})*${auroraBadgeHi}:\n`;
    shiftSummary += `• वर्तमान तापमान ${currentTemp}°C है।`;
    if (maxTempHour && tempRise > 1.5) {
      shiftSummary += ` दोपहर ${maxTempHour} तक बढ़कर अधिकतम ${maxTemp}°C तक पहुंचेगा (+${tempRise}°C की वृद्धि)।`;
    } else {
      shiftSummary += ` अधिकतम तापमान ${maxTemp}°C रहने का अनुमान है।`;
    }
    if (minTempHour) {
      shiftSummary += ` रात/सुबह ${minTempHour} तक गिरकर ${minTemp}°C हो जाएगा (तापमान में अंतर: ${tempSwing}°C)।`;
    }
    if (hasPeakHeat) {
      shiftSummary += `\n• ☀️ *कड़ी धूप का समय:* दोपहर ${heatStart} से ${heatEnd} के बीच अत्यधिक गर्मी रहेगी।`;
    }
    if (rainExpected && rainStart) {
      shiftSummary += `\n• 🌧️ *बारिश की संभावना:* शाम ${rainStart} के आसपास बारिश के आसार हैं (${maxRainProb}% संभावना)।`;
    }
  } else {
    shiftSummary = `🌡️ *Next 24-Hour Weather Shifts (${cityName})*${auroraBadge}:\n`;
    shiftSummary += `• Currently ${currentTemp}°C`;
    if (maxTempHour && tempRise > 1.5) {
      shiftSummary += `, climbing to a peak of ${maxTemp}°C around ${maxTempHour} (+${tempRise}°C rise).`;
    } else {
      shiftSummary += `, reaching a peak of ${maxTemp}°C.`;
    }
    if (minTempHour) {
      shiftSummary += ` Drops overnight to ${minTemp}°C around ${minTempHour} (24h swing: ${tempSwing}°C).`;
    }
    if (hasPeakHeat) {
      shiftSummary += `\n• ☀️ *Peak Heat Window:* ${heatStart} to ${heatEnd} (feels like up to ${heatWindow.peakFeels ?? maxTemp}°C).`;
    }
    if (rainExpected && rainStart) {
      shiftSummary += `\n• 🌧️ *Rain / Showers:* Expected starting around ${rainStart} (${maxRainProb}% chance).`;
    }
    if (aqiWorsens && aqiPeakHour) {
      shiftSummary += `\n• 🌫️ *Air Quality:* Spikes to AQI ${aqi.peak} around ${aqiPeakHour}.`;
    }
  }

  // 2. Time-Windowed Action Recommendations across the 24h timeline
  const actions = [];
  if (locale === 'te') {
    if (tempRise > 1.5 || (maxTempHour && !maxTempHour.includes('AM'))) {
      actions.push(`ఉదయం (11:00 AM లోపు): వాతావరణం ఆహ్లాదకరంగా ఉన్నందున బయటి పనులు లేదా శిశువు వాకింగ్ పూర్తి చేసుకోండి.`);
    }
    if (hasPeakHeat) {
      if (subjectType === 'infant') {
        actions.push(`మధ్యాహ్నం ${heatStart}–${heatEnd}: శిశువును చల్లని, నీడ ఉన్న గదిలో ఉంచండి. తరచుగా తల్లిపాలు ఇవ్వండి (6 నెలల లోపు నీరు అస్సలు ఇవ్వకూడదు).`);
      } else if (subjectType === 'pregnant_person') {
        actions.push(`మధ్యాహ్నం ${heatStart}–${heatEnd}: బయటకు వెళ్లడం మానుకోండి. కొబ్బరి నీరు, మజ్జిగ తాగుతూ విశ్రాంతి తీసుకోండి.`);
      } else if (subjectType === 'child') {
        actions.push(`మధ్యాహ్నం ${heatStart}–${heatEnd}: పిల్లలను ఎండలో ఆడుకోనివ్వకండి; ఇంటి లోపల ఉంచి నీరు తాగించండి.`);
      } else {
        actions.push(`మధ్యాహ్నం ${heatStart}–${heatEnd}: తీవ్రమైన శారీరక శ్రమను తగ్గించండి మరియు కనీసం 2.5–3 లీటర్ల నీరు తాగండి.`);
      }
    }
    if (rainExpected) {
      actions.push(rainStart ? `సాయంత్రం ${rainStart} తర్వాత: బయటకు వెళ్లేటప్పుడు గొడుగు లేదా రెయిన్‌కోట్ వెంట ఉంచుకోండి.` : 'వర్షం కురిసే అవకాశం ఉన్నందున గొడుగు వెంట ఉంచుకోండి.');
      actions.push('దోమలు చేరకుండా ఇంటి పరిసరాల్లో నీరు నిల్వ ఉండకుండా జాగ్రత్తపడండి.');
    }
    if (tempSwing >= 8 && minTempHour) {
      actions.push(`రాత్రి/తెల్లవారుజామున (${minTempHour}): ఉష్ణోగ్రత గణనీయంగా తగ్గుతుంది, శిశువుకు తగినంత వెచ్చని కాటన్ వస్త్రాలు ఉండేలా చూసుకోండి.`);
    }
    if (actions.length === 0) {
      actions.push('రోజంతా తగినంత నీరు తాగుతూ శరీరాన్ని హైడ్రేటెడ్ గా ఉంచుకోండి.');
      actions.push('వదులైన తేలికపాటి కాటన్ దుస్తులను ధరించండి.');
    }
  } else if (locale === 'hi') {
    if (tempRise > 1.5 || (maxTempHour && !maxTempHour.includes('AM'))) {
      actions.push(`सुबह (11:00 AM से पहले): तापमान सुखद रहने के दौरान ही बाहर के जरूरी काम या बच्चों को टहलाना पूरा कर लें।`);
    }
    if (hasPeakHeat) {
      if (subjectType === 'infant') {
        actions.push(`दोपहर ${heatStart}–${heatEnd}: शिशु को सीधे धूप से दूर ठंडे कमरे में रखें। बार-बार स्तनपान कराएं (6 माह से कम उम्र में सादा पानी बिल्कुल न दें)।`);
      } else if (subjectType === 'pregnant_person') {
        actions.push(`दोपहर ${heatStart}–${heatEnd}: धूप में बाहर निकलने से बचें। पर्याप्त नारियल पानी, नींबू पानी या छाछ पिएं।`);
      } else if (subjectType === 'child') {
        actions.push(`दोपहर ${heatStart}–${heatEnd}: बच्चों को धूप में न खेलने दें, छायादार स्थान में रखें और समय-समय पर पानी पिलाएं।`);
      } else {
        actions.push(`दोपहर ${heatStart}–${heatEnd}: धूप और भारी शारीरिक श्रम से बचें और भरपूर पानी पिएं।`);
      }
    }
    if (rainExpected) {
      actions.push(rainStart ? `शाम ${rainStart} के बाद: बाहर निकलते समय छाता साथ रखें।` : 'बारिश की संभावना के कारण छाता साथ रखें।');
      actions.push('मच्छरों और बीमारियों से बचने के लिए घर के आसपास पानी जमा न होने दें।');
    }
    if (tempSwing >= 8 && minTempHour) {
      actions.push(`रात/सुबह (${minTempHour}): तापमान में गिरावट को देखते हुए बच्चों को उपयुक्त कपड़े पहनाएं।`);
    }
    if (actions.length === 0) {
      actions.push('दिनभर पर्याप्त पानी पिएं और खुद को हाइड्रेटेड रखें।');
      actions.push('हल्के सूती कपड़े पहनें।');
    }
  } else {
    if (tempRise > 1.5 || (maxTempHour && !maxTempHour.includes('AM'))) {
      actions.push(`Morning (before 11:00 AM): Mild temperatures make this the best window for outdoor errands, appointments, or walking baby.`);
    }
    if (hasPeakHeat) {
      if (subjectType === 'infant') {
        actions.push(`During ${heatStart}–${heatEnd}: Dress baby in light, breathable cotton and keep in a cool, ventilated room away from direct heat. Offer frequent feeds (breastmilk or formula only — strictly NO plain water under 6 months).`);
      } else if (subjectType === 'pregnant_person') {
        actions.push(`During ${heatStart}–${heatEnd}: Avoid outdoor sun exposure. Stay hydrated with tender coconut water, lemon water, or buttermilk, and rest in shaded spaces.`);
      } else if (subjectType === 'child') {
        actions.push(`During ${heatStart}–${heatEnd}: Restrict outdoor play to before 10 AM or after 5 PM; keep a water bottle accessible.`);
      } else {
        actions.push(`During ${heatStart}–${heatEnd}: Limit strenuous outdoor work and drink at least 2.5–3 liters of water.`);
      }
    }
    if (rainExpected) {
      actions.push(rainStart ? `After ${rainStart}: Carry an umbrella or rain cover when stepping out.` : 'Carry an umbrella as showers are expected.');
      actions.push('Clear stagnant water around your home to prevent mosquito breeding.');
    }
    if (tempSwing >= 8 && minTempHour) {
      actions.push(`Overnight into early morning (${minTempHour}): The significant temperature drop means dressing little ones in adjustable layers.`);
    }
    if (actions.length === 0) {
      actions.push('Stay well-hydrated throughout the day and wear breathable cotton clothing.');
      actions.push('Avoid peak sun exposure during midday hours.');
    }
  }

  const actionTitle = locale === 'te'
    ? '💡 *సమయానుకూలంగా తీసుకోవలసిన జాగ్రత్తలు*:'
    : locale === 'hi'
    ? '💡 *समय अनुसार आवश्यक सावधानियां*:'
    : '💡 *Recommended Actions Across the 24h Window*:';

  const disclaimer = locale === 'te'
    ? '_అత్యవసర పరిస్థితుల్లో 112 కు కాల్ చేయండి._'
    : locale === 'hi'
    ? '_आपात स्थिति में 112 पर कॉल करें।_'
    : '_For emergencies, call 112._';

  return `${shiftSummary}\n\n${actionTitle}\n` + actions.slice(0, 4).map((a) => `• ${a}`).join('\n') + `\n\n${disclaimer}`;
}


