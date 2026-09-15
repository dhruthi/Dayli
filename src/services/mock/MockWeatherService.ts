import { IWeatherService, WeatherData } from '../interfaces';
import { climateService } from '../climate/climateService';

export class MockWeatherService implements IWeatherService {
  async getClimateHealthData(latitude: number, longitude: number, locationName?: string): Promise<WeatherData> {
    return await climateService.getClimateHealthData(latitude, longitude, locationName);
  }
}

export const weatherService = new MockWeatherService();
