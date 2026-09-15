import { NormalizedClimateData, RawWeatherData, LocationInfo } from './types';
import { getAQIStatus, getUVStatus } from './riskThresholds';

export class ClimateNormalizer {
  /**
   * Standardize raw weather provider payload into clean NormalizedClimateData
   */
  normalize(raw: RawWeatherData, location: LocationInfo): NormalizedClimateData {
    const tempC = typeof raw.temperature_c === 'number' && !isNaN(raw.temperature_c) ? raw.temperature_c : 41.5;
    const feelsC = typeof raw.feels_like_c === 'number' && !isNaN(raw.feels_like_c) ? raw.feels_like_c : tempC + 4.5;
    const humidity = typeof raw.humidity_percent === 'number' && !isNaN(raw.humidity_percent) ? raw.humidity_percent : 50;
    const windSpeed = typeof raw.wind_speed_kmh === 'number' && !isNaN(raw.wind_speed_kmh) ? raw.wind_speed_kmh : 12;
    const precip = typeof raw.precipitation_mm === 'number' && !isNaN(raw.precipitation_mm) ? raw.precipitation_mm : 0;
    const aqiVal = typeof raw.aqi === 'number' && !isNaN(raw.aqi) ? Math.round(raw.aqi) : 185;
    const uvVal = typeof raw.uv_index === 'number' && !isNaN(raw.uv_index) ? Math.round(raw.uv_index) : 9;

    return {
      temperature_c: Number(tempC.toFixed(1)),
      feels_like_c: Number(feelsC.toFixed(1)),
      humidity_percent: Math.round(humidity),
      wind_speed_kmh: Number(windSpeed.toFixed(1)),
      precipitation_mm: Number(precip.toFixed(1)),
      aqi: aqiVal,
      aqi_status: getAQIStatus(aqiVal),
      uv_index: uvVal,
      uv_status: getUVStatus(uvVal),
      condition_text: raw.condition_text || 'Extreme Ambient Thermal Stress',
      timestamp: new Date().toISOString(),
      location: {
        ...location,
        city: raw.location_name || location.city,
      },
    };
  }
}

export const climateNormalizer = new ClimateNormalizer();
