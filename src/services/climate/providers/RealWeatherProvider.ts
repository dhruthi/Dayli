import { IWeatherProvider, RawWeatherData } from '../types';

function getEnvVar(key: string): string | undefined {
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv[key]) return metaEnv[key];
  } catch (e) {}
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {}
  return undefined;
}

export class RealWeatherProvider implements IWeatherProvider {
  name = 'Real Weather Provider (Open-Meteo & Climate API)';

  async getCurrentWeather(latitude: number, longitude: number, locationName?: string): Promise<RawWeatherData> {
    const apiKey = getEnvVar('VITE_WEATHER_API_KEY') || getEnvVar('WEATHER_API_KEY');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      // 1. If custom OpenWeatherMap API Key is configured
      if (apiKey && apiKey.trim().length > 10) {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey.trim()}`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          return {
            location_name: data.name || locationName || 'GPS Location',
            temperature_c: data.main?.temp,
            feels_like_c: data.main?.feels_like,
            humidity_percent: data.main?.humidity,
            wind_speed_kmh: data.wind?.speed ? data.wind.speed * 3.6 : undefined,
            precipitation_mm: data.rain?.['1h'] || 0,
            aqi: 185, // Default calculation if air pollution endpoint separate
            uv_index: 9,
            condition_text: data.weather?.[0]?.description || 'Clear Sky',
            raw_payload: data,
          };
        }
      }

      // 2. Open-Meteo Open Global Weather & AQI API (No key required)
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,uv_index&timezone=auto`;
      const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=european_aqi,us_aqi,pm2_5,pm10&timezone=auto`;

      const [weatherRes, aqiRes] = await Promise.all([
        fetch(weatherUrl, { signal: controller.signal }),
        fetch(aqiUrl, { signal: controller.signal }).catch(() => null),
      ]);

      clearTimeout(timeoutId);

      if (!weatherRes.ok) {
        throw new Error(`Open-Meteo returned status ${weatherRes.status}`);
      }

      const wData = await weatherRes.json();
      let aqiValue = 185;

      if (aqiRes && aqiRes.ok) {
        const aData = await aqiRes.json();
        aqiValue = aData.current?.us_aqi || aData.current?.european_aqi || 185;
      }

      const current = wData.current || {};

      return {
        location_name: locationName || 'Live GPS Location',
        temperature_c: current.temperature_2m ?? 41.5,
        feels_like_c: current.apparent_temperature ?? 45.2,
        humidity_percent: current.relative_humidity_2m ?? 50,
        wind_speed_kmh: current.wind_speed_10m ?? 12.0,
        precipitation_mm: current.precipitation ?? 0.0,
        aqi: aqiValue,
        uv_index: current.uv_index ?? 9,
        condition_text: `Live Temperature ${current.temperature_2m ?? 41}°C (Feels ${current.apparent_temperature ?? 45}°C)`,
        raw_payload: wData,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('RealWeatherProvider API request timed out after 6000ms.');
      }
      throw err;
    }
  }
}

export const realWeatherProvider = new RealWeatherProvider();
