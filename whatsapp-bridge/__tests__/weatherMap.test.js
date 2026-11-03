import { describe, it, expect } from 'vitest';
import {
  isWeatherMapQuery,
  buildWeatherMapLinks,
  getWeatherMapData,
  HYDERABAD_DEFAULT,
} from '../lib/weatherMap.js';

describe('Weather & Radar Map Intelligence (lib/weatherMap.js)', () => {
  describe('isWeatherMapQuery intent detector', () => {
    it('detects English weather map and radar queries', () => {
      expect(isWeatherMapQuery('give me weather map in hyderabad')).toBe(true);
      expect(isWeatherMapQuery('show me the weather map')).toBe(true);
      expect(isWeatherMapQuery('weather map hyderabad')).toBe(true);
      expect(isWeatherMapQuery('doppler radar map')).toBe(true);
      expect(isWeatherMapQuery('live rain map')).toBe(true);
      expect(isWeatherMapQuery('satellite clouds map')).toBe(true);
      expect(isWeatherMapQuery('storm tracker radar')).toBe(true);
      expect(isWeatherMapQuery('map of weather in hyderabad')).toBe(true);
    });

    it('detects Telugu and Hindi weather map queries', () => {
      expect(isWeatherMapQuery('హైదరాబాద్ వాతావరణ పటం చూపించు')).toBe(true);
      expect(isWeatherMapQuery('వాతావరణ పటం')).toBe(true);
      expect(isWeatherMapQuery('వర్ష రాడార్ పటం')).toBe(true);
      expect(isWeatherMapQuery('హైదరాబాద్ రాడార్ మ్యాప్')).toBe(true);
      expect(isWeatherMapQuery('हैदराबाद मौसम का नक्शा')).toBe(true);
      expect(isWeatherMapQuery('मौसम नक्शा दिखाओ')).toBe(true);
      expect(isWeatherMapQuery('बारिश का रडार मैप')).toBe(true);
    });

    it('does not falsely trigger on non-map queries', () => {
      expect(isWeatherMapQuery('what is the weather in hyderabad?')).toBe(false);
      expect(isWeatherMapQuery('temperature today')).toBe(false);
      expect(isWeatherMapQuery('my baby has high fever')).toBe(false);
      expect(isWeatherMapQuery('find nearby hospitals')).toBe(false);
      expect(isWeatherMapQuery('')).toBe(false);
      expect(isWeatherMapQuery(null)).toBe(false);
    });
  });

  describe('buildWeatherMapLinks link builder', () => {
    it('constructs correct Windy and RainViewer links for Hyderabad', () => {
      const links = buildWeatherMapLinks(HYDERABAD_DEFAULT.lat, HYDERABAD_DEFAULT.lon, 'Hyderabad');
      expect(links.windyRadar).toContain('17.385');
      expect(links.windyRadar).toContain('78.486');
      expect(links.windyRadar).toContain('radar');
      expect(links.windySatellite).toContain('satellite');
      expect(links.rainViewer).toContain('hyderabad-india.html');
      expect(links.openMeteo).toContain('latitude=17.385');
    });

    it('constructs correct links for custom coordinates outside Hyderabad', () => {
      const links = buildWeatherMapLinks(12.9716, 77.5946, 'Bengaluru');
      expect(links.windyRadar).toContain('12.972');
      expect(links.windyRadar).toContain('77.595');
      expect(links.rainViewer).toContain('loc=12.972,77.595');
    });

    it('handles null coordinates safely by falling back to Hyderabad default', () => {
      const links = buildWeatherMapLinks(null, null);
      expect(links.windyRadar).toContain('17.385');
      expect(links.windySatellite).toContain('78.486');
    });
  });

  describe('getWeatherMapData formatted response', () => {
    it('generates English response with previewUrl enabled and key links', () => {
      const result = getWeatherMapData({
        lat: 17.385,
        lon: 78.486,
        cityName: 'Hyderabad',
        climateData: {
          temperature: 28.5,
          feelsLike: 31.2,
          humidity: 65,
          aqi: 58,
        },
        forecast5dData: {
          days: [{ maxTemp: 34.0, rainProb: 15 }],
        },
        locale: 'en',
      });

      expect(result.previewUrl).toBe(true);
      expect(result.body).toContain('Hyderabad Live Weather & Doppler Radar Map');
      expect(result.body).toContain('28.5°C');
      expect(result.body).toContain('31.2°C');
      expect(result.body).toContain('65%');
      expect(result.body).toContain('Expected peak today: 34°C');
      expect(result.body).toContain(result.links.windyRadar);
      expect(result.body).toContain(result.links.windySatellite);
      expect(result.body).toContain(result.links.rainViewer);
      // Clinical safety check: infant hydration rule
      expect(result.body).toContain('never plain water');
    });

    it('generates Telugu localized response', () => {
      const result = getWeatherMapData({
        lat: 17.385,
        lon: 78.486,
        cityName: 'హైదరాబాద్',
        climateData: {
          temperature: 29.0,
          feelsLike: 32.0,
          humidity: 70,
          aqi: 60,
        },
        locale: 'te',
      });

      expect(result.previewUrl).toBe(true);
      expect(result.body).toContain('లైవ్ వాతావరణం & డాప్లర్ రాడార్ పటం');
      expect(result.body).toContain('29°C');
      expect(result.body).toContain('లైవ్ డాప్లర్ రాడార్');
      expect(result.body).toContain('నీరు ఇవ్వకూడదు');
    });

    it('generates Hindi localized response', () => {
      const result = getWeatherMapData({
        lat: 17.385,
        lon: 78.486,
        cityName: 'हैदराबाद',
        climateData: {
          temperature: 29.0,
          feelsLike: 32.0,
          humidity: 70,
          aqi: 60,
        },
        locale: 'hi',
      });

      expect(result.previewUrl).toBe(true);
      expect(result.body).toContain('लाइव मौसम और डॉपलर रडार मैप');
      expect(result.body).toContain('29°C');
      expect(result.body).toContain('लाइव डॉपलर रडार');
      expect(result.body).toContain('सादा पानी बिल्कुल न दें');
    });
  });
});
