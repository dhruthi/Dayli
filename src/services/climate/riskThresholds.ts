export const HEAT_THRESHOLDS = {
  LOW: { maxTempC: 32.0, maxFeelsLikeC: 35.0 },
  MODERATE: { maxTempC: 37.0, maxFeelsLikeC: 40.0 },
  HIGH: { maxTempC: 41.0, maxFeelsLikeC: 45.0 },
  EXTREME: { minTempC: 41.1, minFeelsLikeC: 45.1 },
};

export const AQI_THRESHOLDS = {
  GOOD: { max: 50, label: 'Good' as const },
  MODERATE: { min: 51, max: 100, label: 'Moderate' as const },
  UNHEALTHY: { min: 101, max: 200, label: 'Unhealthy' as const },
  SEVERE: { min: 201, max: 300, label: 'Severe' as const },
  HAZARDOUS: { min: 301, label: 'Hazardous' as const },
};

export const UV_THRESHOLDS = {
  LOW: { max: 2, label: 'Low' as const },
  MODERATE: { min: 3, max: 5, label: 'Moderate' as const },
  HIGH: { min: 6, max: 7, label: 'High' as const },
  VERY_HIGH: { min: 8, max: 10, label: 'Very High' as const },
  EXTREME: { min: 11, label: 'Extreme' as const },
};

export function getAQIStatus(aqi: number): 'Good' | 'Moderate' | 'Unhealthy' | 'Severe' | 'Hazardous' {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Severe';
  return 'Hazardous';
}

export function getUVStatus(uv: number): 'Low' | 'Moderate' | 'High' | 'Very High' | 'Extreme' {
  if (uv <= 2) return 'Low';
  if (uv <= 5) return 'Moderate';
  if (uv <= 7) return 'High';
  if (uv <= 10) return 'Very High';
  return 'Extreme';
}
