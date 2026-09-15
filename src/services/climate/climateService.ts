import {
  NormalizedClimateData,
  HealthRiskAssessment,
  HydrationCalculation,
  StructuredClimateAdvice,
  ClimateServiceStatus,
  IWeatherProvider,
} from './types';
import { locationService } from './locationService';
import { climateNormalizer } from './normalizer';
import { healthRiskEngine } from './healthRiskEngine';
import { hydrationEngine } from './hydrationEngine';
import { climateAdviceEngine } from './climateAdviceEngine';
import { climateCache } from './climateCache';
import { mockWeatherProvider } from './providers/MockWeatherProvider';
import { realWeatherProvider } from './providers/RealWeatherProvider';
import { UserProfile } from '../../types/chatEngine';
import { WeatherData } from '../../types/services';

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

export interface ClimateIntelligenceResult {
  normalized: NormalizedClimateData;
  riskAssessment: HealthRiskAssessment;
  hydration: HydrationCalculation;
  advice: StructuredClimateAdvice;
  sourceType: 'real' | 'mock' | 'mock_fallback';
  latencyMs: number;
  providerName: string;
}

export class ClimateService {
  private activeProviderType: 'auto' | 'real' | 'mock' = 'auto';
  private lastLatencyMs = 0;
  private lastRequestTimestamp = '';
  private lastSourceType: 'real' | 'mock' | 'mock_fallback' = 'mock';

  constructor() {
    const envProvider = getEnvVar('VITE_WEATHER_PROVIDER_TYPE') || getEnvVar('WEATHER_PROVIDER_TYPE');
    if (envProvider === 'real' || envProvider === 'mock' || envProvider === 'auto') {
      this.activeProviderType = envProvider;
    }
  }

  setProviderType(type: 'auto' | 'real' | 'mock'): void {
    this.activeProviderType = type;
  }

  getProviderType(): 'auto' | 'real' | 'mock' {
    return this.activeProviderType;
  }

  /**
   * Primary entry point: Get full Climate Intelligence payload for given coordinates/location
   */
  async getClimateIntelligence(params: {
    latitude?: number;
    longitude?: number;
    locationName?: string;
    userProfile?: UserProfile;
    forceRefresh?: boolean;
  }): Promise<ClimateIntelligenceResult> {
    const startTime = Date.now();

    // 1. Resolve Location
    const loc = locationService.resolveLocation(params.latitude, params.longitude, params.locationName);

    // 2. Check Cache (unless forceRefresh)
    if (!params.forceRefresh) {
      const cached = climateCache.get(loc.latitude, loc.longitude);
      if (cached) {
        const risk = healthRiskEngine.evaluate(cached);
        const hydration = hydrationEngine.calculateHydration({
          climateData: cached,
          userProfile: params.userProfile,
        });
        const advice = climateAdviceEngine.generateAdvice({
          climateData: cached,
          riskAssessment: risk,
          hydration,
          userProfile: params.userProfile || { name: 'User', phoneNumber: '', language: 'en' },
        });

        return {
          normalized: cached,
          riskAssessment: risk,
          hydration,
          advice,
          sourceType: this.lastSourceType,
          latencyMs: 5,
          providerName: 'Climate Cache (10-min TTL)',
        };
      }
    }

    // 3. Provider Selection & Fetching with Fallback
    let rawPayload: any = null;
    let sourceType: 'real' | 'mock' | 'mock_fallback' = 'mock';
    let providerUsed: IWeatherProvider = mockWeatherProvider;

    const shouldAttemptReal = this.activeProviderType === 'real' || this.activeProviderType === 'auto';

    if (shouldAttemptReal) {
      try {
        providerUsed = realWeatherProvider;
        rawPayload = await realWeatherProvider.getCurrentWeather(loc.latitude, loc.longitude, loc.city);
        sourceType = 'real';
      } catch (err: any) {
        console.warn('RealWeatherProvider failed, executing automatic fallback to MockWeatherProvider:', err.message);
        providerUsed = mockWeatherProvider;
        rawPayload = await mockWeatherProvider.getCurrentWeather(loc.latitude, loc.longitude, loc.city);
        sourceType = 'mock_fallback';
      }
    } else {
      providerUsed = mockWeatherProvider;
      rawPayload = await mockWeatherProvider.getCurrentWeather(loc.latitude, loc.longitude, loc.city);
      sourceType = 'mock';
    }

    // 4. Normalize Data
    const normalized = climateNormalizer.normalize(rawPayload, loc);

    // 5. Cache Normalized Data
    climateCache.set(loc.latitude, loc.longitude, normalized);

    // 6. Evaluate Health Risk & Hydration Target
    const riskAssessment = healthRiskEngine.evaluate(normalized);
    const hydration = hydrationEngine.calculateHydration({
      climateData: normalized,
      userProfile: params.userProfile,
    });
    const advice = climateAdviceEngine.generateAdvice({
      climateData: normalized,
      riskAssessment,
      hydration,
      userProfile: params.userProfile || { name: 'User', phoneNumber: '', language: 'en' },
    });

    const latencyMs = Date.now() - startTime;
    this.lastLatencyMs = latencyMs;
    this.lastRequestTimestamp = new Date().toISOString();
    this.lastSourceType = sourceType;

    return {
      normalized,
      riskAssessment,
      hydration,
      advice,
      sourceType,
      latencyMs,
      providerName: providerUsed.name,
    };
  }

  /**
   * Adapter method returning backward-compatible WeatherData for ChatEngine & existing services
   */
  async getClimateHealthData(latitude: number, longitude: number, locationName?: string): Promise<WeatherData> {
    const intel = await this.getClimateIntelligence({
      latitude,
      longitude,
      locationName,
    });

    const n = intel.normalized;
    const r = intel.riskAssessment;
    const h = intel.hydration;
    const a = intel.advice;

    const heatLevelStr =
      r.heat_risk === 'extreme'
        ? 'Extreme Danger'
        : r.heat_risk === 'high'
        ? 'Danger'
        : r.heat_risk === 'moderate'
        ? 'Caution'
        : 'Normal';

    return {
      cityName: n.location.city,
      temperatureC: n.temperature_c,
      feelsLikeC: n.feels_like_c,
      humidityPercent: n.humidity_percent,
      aqi: n.aqi,
      aqiStatus: n.aqi_status,
      uvIndex: n.uv_index,
      weatherConditionText: n.condition_text,
      heatWaveAdvisory: r.heat_risk === 'extreme' || r.heat_risk === 'high',
      heatLevel: heatLevelStr as any,
      maternalRiskLevel: r.risk_factors.join('; ') || 'Elevated Climate Risk',
      hydrationTargetLiters: h.recommended_target_liters,
      recommendation: `🚨 CLIMATE BULLETIN for ${n.location.city}:\nAmbient temp is ${n.temperature_c}°C (Feels like ${n.feels_like_c}°C) with AQI ${n.aqi} (${n.aqi_status}).\n\n• ${a.recommendations.join('\n• ')}`,
      coolingAdvice: `• ${a.avoid.join('\n• ')}\n• ${h.disclaimer}`,
    };
  }

  /**
   * Status reporter for Developer Console
   */
  getStatus(): ClimateServiceStatus {
    const apiKey = getEnvVar('VITE_WEATHER_API_KEY') || getEnvVar('WEATHER_API_KEY');
    let maskedApiKey: string | undefined = undefined;
    if (apiKey && apiKey.length > 6) {
      maskedApiKey = `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 3)}`;
    }

    return {
      activeProvider: this.activeProviderType,
      isConfigured: true,
      sourceType: this.lastSourceType,
      cachedEntriesCount: climateCache.size(),
      lastRequestLatencyMs: this.lastLatencyMs,
      lastRequestTimestamp: this.lastRequestTimestamp,
      maskedApiKey,
    };
  }
}

export const climateService = new ClimateService();
