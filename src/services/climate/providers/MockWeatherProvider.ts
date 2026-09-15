import { IWeatherProvider, RawWeatherData } from '../types';

export class MockWeatherProvider implements IWeatherProvider {
  name = 'Mock Weather Provider (Micro-Zone Simulator)';

  async getCurrentWeather(latitude: number, longitude: number, locationName?: string): Promise<RawWeatherData> {
    // Artificial latency for realistic API simulation
    await new Promise((resolve) => setTimeout(resolve, 300));

    const locUpper = (locationName || '').toUpperCase();

    // 1. Extreme Heatwave Zone (e.g. New Delhi / North)
    if (locUpper.includes('DELHI') || locUpper.includes('JAIPUR') || (latitude > 25 && latitude < 30)) {
      return {
        location_name: locationName || 'New Delhi (Northern Heat Corridor)',
        temperature_c: 42.5,
        feels_like_c: 47.8,
        humidity_percent: 42,
        wind_speed_kmh: 14.5,
        precipitation_mm: 0.0,
        aqi: 215,
        uv_index: 11,
        condition_text: 'Extreme Dry Heatwave & Severe Smog Alert',
        raw_payload: { simulated_zone: 'delhi_heatwave' },
      };
    }

    // 2. High Coastal Humidity Zone (e.g. Mumbai / Chennai)
    if (locUpper.includes('MUMBAI') || locUpper.includes('CHENNAI') || locUpper.includes('COASTAL')) {
      return {
        location_name: locationName || 'Mumbai (Coastal High Humidity Zone)',
        temperature_c: 36.5,
        feels_like_c: 44.2,
        humidity_percent: 82,
        wind_speed_kmh: 18.0,
        precipitation_mm: 2.1,
        aqi: 142,
        uv_index: 9,
        condition_text: 'Severe Humid Heat Stress & High Dehydration Risk',
        raw_payload: { simulated_zone: 'mumbai_coastal' },
      };
    }

    // 3. High Pollution Industrial Belt (e.g. Kolkata / Gurgaon)
    if (locUpper.includes('KOLKATA') || locUpper.includes('GURGAON') || locUpper.includes('KANPUR')) {
      return {
        location_name: locationName || 'Kolkata (Gangetic Industrial Belt)',
        temperature_c: 38.0,
        feels_like_c: 43.0,
        humidity_percent: 74,
        wind_speed_kmh: 10.2,
        precipitation_mm: 0.5,
        aqi: 290,
        uv_index: 8,
        condition_text: 'Hazardous Air Quality (AQI 290) & Thermal Distress',
        raw_payload: { simulated_zone: 'kolkata_industrial' },
      };
    }

    // 4. Deccan Plateau Heatwave & High UV Zone (e.g. Hyderabad / Nagpur)
    if (
      locUpper.includes('HYDERABAD') ||
      locUpper.includes('NAGPUR') ||
      locUpper.includes('TELANGANA') ||
      (latitude > 16.5 && latitude < 18.5 && longitude > 77.5 && longitude < 79.5)
    ) {
      return {
        location_name: locationName || 'Hyderabad (Deccan Plateau Heat Zone)',
        temperature_c: 41.8,
        feels_like_c: 46.5,
        humidity_percent: 48,
        wind_speed_kmh: 15.2,
        precipitation_mm: 0.0,
        aqi: 165,
        uv_index: 11,
        condition_text: 'Intense Deccan Solar Radiation & Acute Dehydration Risk',
        raw_payload: { simulated_zone: 'hyderabad_deccan' },
      };
    }

    // 5. Default Micro-Zone
    return {
      location_name: locationName || 'Local GPS Micro-Climate Zone',
      temperature_c: 41.0,
      feels_like_c: 45.5,
      humidity_percent: 62,
      wind_speed_kmh: 12.0,
      precipitation_mm: 0.0,
      aqi: 178,
      uv_index: 10,
      condition_text: 'Extreme Ambient Heat Advisory',
      raw_payload: { simulated_zone: 'default_gps' },
    };
  }
}

export const mockWeatherProvider = new MockWeatherProvider();
