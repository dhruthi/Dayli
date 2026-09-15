export interface LocationInfo {
  latitude: number;
  longitude: number;
  city: string;
  state?: string;
  country?: string;
  source: 'gps' | 'simulated' | 'whatsapp' | 'manual';
}

export interface RawWeatherData {
  temperature_c?: number;
  feels_like_c?: number;
  humidity_percent?: number;
  wind_speed_kmh?: number;
  precipitation_mm?: number;
  aqi?: number;
  uv_index?: number;
  condition_text?: string;
  location_name?: string;
  raw_payload?: any;
}

export interface NormalizedClimateData {
  temperature_c: number;
  feels_like_c: number;
  humidity_percent: number;
  wind_speed_kmh: number;
  precipitation_mm: number;
  aqi: number;
  aqi_status: 'Good' | 'Moderate' | 'Unhealthy' | 'Severe' | 'Hazardous';
  uv_index: number;
  uv_status: 'Low' | 'Moderate' | 'High' | 'Very High' | 'Extreme';
  condition_text: string;
  timestamp: string;
  location: LocationInfo;
}

export type ClimateRiskCategory = 'low' | 'moderate' | 'high' | 'extreme';

export interface HealthRiskAssessment {
  heat_risk: ClimateRiskCategory;
  dehydration_risk: ClimateRiskCategory;
  air_quality_risk: ClimateRiskCategory;
  uv_risk: ClimateRiskCategory;
  overall_climate_risk: ClimateRiskCategory;
  risk_factors: string[];
}

export interface HydrationCalculation {
  recommended_target_ml: number;
  recommended_target_liters: number;
  range_ml: {
    min: number;
    max: number;
  };
  reason: string;
  disclaimer: string;
}

export interface StructuredClimateAdvice {
  priority: 'low' | 'moderate' | 'high' | 'critical';
  recommendations: string[];
  avoid: string[];
  monitor: string[];
}

export interface IWeatherProvider {
  name: string;
  getCurrentWeather(latitude: number, longitude: number, locationName?: string): Promise<RawWeatherData>;
}

export interface ClimateServiceStatus {
  activeProvider: string;
  isConfigured: boolean;
  sourceType: 'real' | 'mock' | 'mock_fallback';
  cachedEntriesCount: number;
  lastRequestLatencyMs?: number;
  lastRequestTimestamp?: string;
  maskedApiKey?: string;
}
