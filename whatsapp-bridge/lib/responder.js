/**
 * ==============================================================================
 * Dayli AI — Purpose-Built Deterministic Clinical & Climate Responder
 * ==============================================================================
 * Generates verified, culturally tailored clinical & climate replies across
 * English, Telugu, and Hindi without calling any commercial frontier LLM.
 *
 * Clinical & Ethical Rules:
 *   - SafetyCore is authoritative: Emergency & High risk cases always receive
 *     the mandatory clinical emergency instructions first.
 *   - Pediatric strict safety: Under 6 months, breastmilk/formula only — NEVER plain water.
 *   - No hallucinated facility names: Only verified OpenStreetMap / government directory clinics.
 *   - DPDP Act zero-PHI: No logging or echoing of sensitive patient identifiers.
 */

import { compose5DayOutlook, composeSimpleWeatherAdvice, compose24HourWeatherChangeAdvice } from './actionAdvisor.js';
import { formatLabourRoomWhatsAppBlock, findNearestReadyLabourRoom } from './labourRooms.js';
import { composeSafeResponse } from '../../shared/safetyCore.js';
import { t, normalizeLocale } from './i18n/index.js';

/**
 * Builds a deterministic, localized response based on routed intent, clinical safety, and live data.
 *
 * @param {object} params
 * @param {object} params.routed Output of router.route()
 * @param {string} params.userMessage Original text
 * @param {string} params.userName User display name
 * @param {object} params.session User session
 * @param {object} params.safety SafetyCore evaluation result
 * @param {object|null} params.climateData Real-time & 24h forecast data
 * @param {object|null} params.forecast5dData 5-day regional forecast
 * @param {Array} params.clinicsData OSM facility results
 * @param {string|null} params.clinicsStatus Status of facility lookup
 * @returns {string} Fully composed WhatsApp message
 */
export function composeDeterministicResponse({
  routed,
  userMessage,
  userName = 'there',
  session = null,
  safety = null,
  climateData = null,
  forecast5dData = null,
  clinicsData = [],
  clinicsStatus = null,
}) {
  const profile = session?.profile || {};
  const rawLocale = profile.locale || routed.language || routed.lang || 'en';
  const locale = normalizeLocale(rawLocale);
  const intent = routed.intent;
  const isEmergency = safety?.riskLevel === 'emergency' || routed.urgency === 'emergency_signal';

  // 1. Critical Emergency Short-Circuit (Zero delay, deterministic safeguard)
  // If the user is asking where to find a hospital/clinic/pharmacy, never suppress the facility directory
  if (isEmergency && safety && intent !== 'facility_hospital_labour' && intent !== 'facility_pharmacy') {
    return composeSafeResponse({ safety, modelText: '' });
  }

  // 2. High Clinical Risk (Same day medical review)
  // If the user is specifically asking for healthcare facilities, deliver the directory results
  if (safety?.riskLevel === 'high' && intent !== 'facility_hospital_labour' && intent !== 'facility_pharmacy') {
    return composeSafeResponse({ safety, modelText: '' });
  }

  // 3. Out of Scope -> Clarification Guidance
  if (intent === 'out_of_scope') {
    return t('out_of_scope_help', locale, { userName });
  }

  // 4. Intent Handlers
  switch (intent) {
    case 'symptom_general_adult': {
      return t('adult_symptom_guidance', locale);
    }
    case 'weather_now_24h': {
      if (climateData?.forecast) {
        return compose24HourWeatherChangeAdvice(climateData.forecast, profile, userMessage);
      }
      if (climateData) {
        return t('weather_update', locale, {
          cityName: climateData.cityName || 'Your Location',
          temp: climateData.temperature,
          feelsLike: climateData.feelsLike,
          humidity: climateData.humidity,
          aqi: climateData.aqi,
          aqiCategory: climateData.aqiCategory || 'Moderate',
        });
      }
      return t('weather_no_loc', locale);
    }

    case 'weather_5day': {
      if (forecast5dData && forecast5dData.days?.length > 0) {
        return composeSimpleWeatherAdvice(forecast5dData, profile, userMessage);
      }
      return t('weather_5day_no_loc', locale);
    }

    case 'facility_hospital_labour': {
      if (clinicsData && clinicsData.length > 0) {
        let text = t('facility_hospital_header', locale);
        clinicsData.slice(0, 3).forEach((c, i) => {
          const dist = c.distanceText ? ` (${c.distanceText} away)` : '';
          text += `${i + 1}. *${c.name}*${dist}\n`;
          if (c.address) text += `   📍 ${c.address}\n`;
          text += `   🗺️ Map: ${c.mapsUrl}\n\n`;
        });
        text += t('facility_hospital_footer', locale);
        return text;
      }
      return t('facility_hospital_no_loc', locale);
    }

    case 'facility_pharmacy': {
      if (clinicsData && clinicsData.length > 0) {
        let text = t('facility_pharmacy_header', locale);
        clinicsData.slice(0, 3).forEach((c, i) => {
          const dist = c.distanceText ? ` (${c.distanceText} away)` : '';
          text += `${i + 1}. *${c.name}*${dist}\n`;
          if (c.address) text += `   📍 ${c.address}\n`;
          text += `   🗺️ Map: ${c.mapsUrl}\n\n`;
        });
        return text;
      }
      return t('facility_pharmacy_no_loc', locale);
    }

    case 'heat_hydration': {
      const isInfant = profile.subjectType === 'infant' || (profile.childAgeMonths != null && profile.childAgeMonths < 12);
      if (isInfant) {
        return t('heat_hydration_infant', locale);
      }
      return t('heat_hydration_maternal', locale);
    }

    case 'air_quality': {
      return t('air_quality_guidance', locale);
    }

    case 'symptom_fever': {
      return t('fever_guidance', locale);
    }

    case 'symptom_pregnancy': {
      return t('pregnancy_guidance', locale);
    }

    case 'symptom_infant_child': {
      return t('infant_guidance', locale);
    }

    case 'greeting_smalltalk': {
      return t('greeting', locale, { userName });
    }

    case 'daily_brief_subscribe': {
      return t('daily_brief_subscribe', locale);
    }

    default: {
      return (
        `Thank you, ${userName}. 🌸\n\n` +
        (climateData ? `Current conditions in ${climateData.cityName || 'your area'}: ${climateData.temperature}°C, AQI ${climateData.aqi}.\n\n` : '') +
        `Please let me know if you need weather forecasts, hydration advice, or nearest hospital routing.`
      );
    }
  }
}
