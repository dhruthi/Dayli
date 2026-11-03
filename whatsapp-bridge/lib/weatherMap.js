/**
 * lib/weatherMap.js
 *
 * Interactive Weather & Doppler Radar Map for Dayli AI.
 *
 * Provides real-time interactive radar and satellite maps for Hyderabad and other
 * Indian cities, with direct links that render rich previews on WhatsApp (Windy,
 * RainViewer, Open-Meteo), current climate intelligence, and localized guidance.
 */

// Approximate coordinates for common cities
const CITY_COORDINATES = {
  hyderabad: { lat: 17.385, lon: 78.486, name: 'Hyderabad', state: 'Telangana' },
  bangalore: { lat: 12.9716, lon: 77.5946, name: 'Bengaluru', state: 'Karnataka' },
  bengaluru: { lat: 12.9716, lon: 77.5946, name: 'Bengaluru', state: 'Karnataka' },
  mumbai: { lat: 19.076, lon: 72.8777, name: 'Mumbai', state: 'Maharashtra' },
  delhi: { lat: 28.6139, lon: 77.209, name: 'Delhi', state: 'Delhi' },
  chennai: { lat: 13.0827, lon: 80.2707, name: 'Chennai', state: 'Tamil Nadu' },
  kolkata: { lat: 22.5726, lon: 88.3639, name: 'Kolkata', state: 'West Bengal' },
  pune: { lat: 18.5204, lon: 73.8567, name: 'Pune', state: 'Maharashtra' },
  visakhapatnam: { lat: 17.6868, lon: 83.2185, name: 'Visakhapatnam', state: 'Andhra Pradesh' },
  vijayawada: { lat: 16.5062, lon: 80.648, name: 'Vijayawada', state: 'Andhra Pradesh' },
};

export const HYDERABAD_DEFAULT = CITY_COORDINATES.hyderabad;

/**
 * Detects if the incoming message is asking for a weather map, radar, or satellite imagery.
 * @param {string} text
 * @returns {boolean}
 */
export function isWeatherMapQuery(text) {
  if (!text || typeof text !== 'string') return false;
  const q = text.toLowerCase().trim();

  // Keyword patterns in English, Telugu, and Hindi
  const patterns = [
    /\b(?:weather|rain|radar|satellite|temp|temperature|heat|cloud|clouds|storm)\s*(?:map|maps|radar|satellite)\b/i,
    /\b(?:map|maps)\s+of\s+(?:weather|rain|radar|satellite|hyderabad|temperature)\b/i,
    /\b(?:radar|satellite|weather\s*map|rain\s*map)\b/i,
    // Telugu patterns
    /(?:వాతావరణ|వర్ష|రాడార్|శాటిలైట్|మేఘాల)\s*(?:పటం|నక్షా|మ్యాప్)/,
    /(?:వాతావరణం|రాడార్)\s*పటం/,
    // Hindi patterns
    /(?:मौसम|बारिश|रडार|सैटेलाइट)\s*(?:का\s*)?(?:नक्शा|मैप)/,
    /(?:मौसम\s*नक्शा|रडार\s*मैप)/,
  ];

  return patterns.some((p) => p.test(q));
}

/**
 * Builds interactive radar and satellite links.
 * @param {number} lat
 * @param {number} lon
 * @param {string} [cityName]
 */
export function buildWeatherMapLinks(lat, lon, cityName = 'Hyderabad') {
  const latitude = typeof lat === 'number' ? lat : HYDERABAD_DEFAULT.lat;
  const longitude = typeof lon === 'number' ? lon : HYDERABAD_DEFAULT.lon;

  const latFixed = latitude.toFixed(3);
  const lonFixed = longitude.toFixed(3);

  // Windy Doppler Radar (Precipitation & storms)
  const windyRadar = `https://www.windy.com/?radar,${latFixed},${lonFixed},9`;

  // Windy Satellite & Cloud Cover
  const windySatellite = `https://www.windy.com/?satellite,${latFixed},${lonFixed},8`;

  // RainViewer live interactive radar (has dedicated page for Hyderabad)
  const isHyd = cityName.toLowerCase().includes('hyderabad') || (Math.abs(latitude - 17.385) < 0.3 && Math.abs(longitude - 78.486) < 0.3);
  const rainViewer = isHyd
    ? 'https://www.rainviewer.com/weather-radar-map-live/hyderabad-india.html'
    : `https://www.rainviewer.com/map.html?loc=${latFixed},${lonFixed},9&layer=radar`;

  // Open-Meteo interactive hourly & weather chart
  const openMeteo = `https://open-meteo.com/en/docs#latitude=${latFixed}&longitude=${lonFixed}`;

  return {
    windyRadar,
    windySatellite,
    rainViewer,
    openMeteo,
  };
}

/**
 * Formats a localized interactive weather map message for WhatsApp.
 * @param {object} params
 * @param {number} params.lat
 * @param {number} params.lon
 * @param {string} params.cityName
 * @param {object} [params.climateData]
 * @param {object} [params.forecast5dData]
 * @param {string} [params.locale]
 * @returns {{ body: string, previewUrl: boolean, links: object }}
 */
export function getWeatherMapData({
  lat = HYDERABAD_DEFAULT.lat,
  lon = HYDERABAD_DEFAULT.lon,
  cityName = 'Hyderabad',
  climateData = null,
  forecast5dData = null,
  locale = 'en',
}) {
  const links = buildWeatherMapLinks(lat, lon, cityName);

  // Temperature & climate summary
  const temp = climateData?.temperature != null ? `${climateData.temperature}°C` : null;
  const feelsLike = climateData?.feelsLike != null ? `${climateData.feelsLike}°C` : null;
  const humidity = climateData?.humidity != null ? `${climateData.humidity}%` : null;
  const aqi = climateData?.aqi != null ? climateData.aqi : null;

  // Peak heat or rain probability if available
  let peakNote = '';
  if (forecast5dData?.days?.[0]) {
    const today = forecast5dData.days[0];
    peakNote = `Expected peak today: ${today.maxTemp}°C. Rain chance: ${today.rainProb}%.`;
  } else if (climateData?.forecast?.summary) {
    peakNote = climateData.forecast.summary;
  }

  if (locale === 'te') {
    let body = `🗺️ *${cityName} లైవ్ వాతావరణం & డాప్లర్ రాడార్ పటం*\n\n`;
    if (temp) {
      body += `ప్రస్తుత ఉష్ణోగ్రత: *${temp}*` + (feelsLike ? ` (అనిపించేది: ${feelsLike})` : '') + `\n`;
      if (humidity) body += `తేమ: ${humidity} | AQI: ${aqi ?? 'సాధారణం'}\n`;
      if (peakNote) body += `${peakNote}\n`;
      body += `\n`;
    }
    body += `లైవ్ రాడార్ మరియు శాటిలైట్ మ్యాప్‌లను క్రింది లింక్‌ల ద్వారా ప్రత్యక్షంగా చూడవచ్చు:\n\n`;
    body += `📡 *లైవ్ డాప్లర్ రాడార్ (వర్షం & తుఫాను ట్రాకింగ్):*\n${links.windyRadar}\n\n`;
    body += `🛰️ *శాటిలైట్ మేఘాలు & గాలి వేగం:*\n${links.windySatellite}\n\n`;
    body += `🌧️ *రెయిన్‌వ్యూయర్ లైవ్ రాడార్:*\n${links.rainViewer}\n\n`;
    body += `💡 *సలహా:* ఎండ తీవ్రంగా ఉన్నప్పుడు బయటకు వెళ్లకుండా జాగ్రత్త వహించండి. శిశువులకు (6 నెలలలోపు) తల్లిపాలు లేదా ఫార్ములా మాత్రమే ఇవ్వండి; నీరు ఇవ్వకూడదు.`;

    return { body, previewUrl: true, links };
  }

  if (locale === 'hi') {
    let body = `🗺️ *${cityName} लाइव मौसम और डॉपलर रडार मैप*\n\n`;
    if (temp) {
      body += `वर्तमान तापमान: *${temp}*` + (feelsLike ? ` (महसूस: ${feelsLike})` : '') + `\n`;
      if (humidity) body += `नमी: ${humidity} | AQI: ${aqi ?? 'सामान्य'}\n`;
      if (peakNote) body += `${peakNote}\n`;
      body += `\n`;
    }
    body += `लाइव रडार और सैटेलाइट मैप नीचे दिए गए लिंक से सीधे देखें:\n\n`;
    body += `📡 *लाइव डॉपलर रडार (बारिश और तूफान ट्रैकर):*\n${links.windyRadar}\n\n`;
    body += `🛰️ *सैटेलाइट बादल और हवा का बहाव:*\n${links.windySatellite}\n\n`;
    body += `🌧️ *रेनव्यूअर लाइव रडार:*\n${links.rainViewer}\n\n`;
    body += `💡 *सुझाव:* धूप तेज होने पर सीधे धूप से बचें और पर्याप्त पानी पिएं। 6 महीने से छोटे शिशुओं को केवल स्तनपान या फॉर्मूला दें, सादा पानी बिल्कुल न दें।`;

    return { body, previewUrl: true, links };
  }

  // English default
  let body = `🗺️ *${cityName} Live Weather & Doppler Radar Map*\n\n`;
  if (temp) {
    body += `Current Temperature: *${temp}*` + (feelsLike ? ` (feels like ${feelsLike})` : '') + `\n`;
    if (humidity) body += `Humidity: ${humidity} | AQI: ${aqi ?? 'Moderate'}\n`;
    if (peakNote) body += `${peakNote}\n`;
    body += `\n`;
  }
  body += `Explore live radar and satellite storm maps in real time:\n\n`;
  body += `📡 *Live Doppler Radar (Rain & Clouds):*\n${links.windyRadar}\n\n`;
  body += `🛰️ *Satellite Cloud Cover & Wind:* \n${links.windySatellite}\n\n`;
  body += `🌧️ *RainViewer Interactive Radar:* \n${links.rainViewer}\n\n`;
  body += `💡 *Health Tip:* During afternoon heat peaks, stay hydrated and indoors where possible. For infants under 6 months, provide breastmilk or formula only — never plain water.`;

  return { body, previewUrl: true, links };
}
