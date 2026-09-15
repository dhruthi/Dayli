import { NormalizedClimateData, HealthRiskAssessment, ClimateRiskCategory } from './types';

export class HealthRiskEngine {
  /**
   * Deterministically calculate climate health risk scores
   */
  evaluate(data: NormalizedClimateData): HealthRiskAssessment {
    const riskFactors: string[] = [];

    // 1. Heat Risk Calculation
    let heat_risk: ClimateRiskCategory = 'low';
    if (data.feels_like_c >= 45 || data.temperature_c >= 41) {
      heat_risk = 'extreme';
      riskFactors.push(`Extreme thermal stress (${data.temperature_c}°C, feels like ${data.feels_like_c}°C)`);
    } else if (data.feels_like_c >= 40 || data.temperature_c >= 37) {
      heat_risk = 'high';
      riskFactors.push(`High ambient heat (${data.temperature_c}°C)`);
    } else if (data.feels_like_c >= 35 || data.temperature_c >= 32) {
      heat_risk = 'moderate';
      riskFactors.push(`Moderate heat caution (${data.temperature_c}°C)`);
    }

    // 2. Dehydration Risk Calculation (factoring high heat + humidity / sweat evaporation loss)
    let dehydration_risk: ClimateRiskCategory = 'low';
    if (data.feels_like_c >= 44 || (data.temperature_c >= 38 && data.humidity_percent >= 70)) {
      dehydration_risk = 'extreme';
      riskFactors.push(`High sweat loss & humidity impediment (${data.humidity_percent}% humidity)`);
    } else if (data.feels_like_c >= 39 || data.temperature_c >= 35) {
      dehydration_risk = 'high';
      riskFactors.push('Accelerated fluid loss in ambient heat');
    } else if (data.feels_like_c >= 34) {
      dehydration_risk = 'moderate';
    }

    // 3. Air Quality Risk Calculation
    let air_quality_risk: ClimateRiskCategory = 'low';
    if (data.aqi >= 300) {
      air_quality_risk = 'extreme';
      riskFactors.push(`Hazardous PM2.5 smog (AQI ${data.aqi})`);
    } else if (data.aqi >= 200) {
      air_quality_risk = 'high';
      riskFactors.push(`Severe air pollution (AQI ${data.aqi})`);
    } else if (data.aqi >= 101) {
      air_quality_risk = 'moderate';
      riskFactors.push(`Unhealthy air quality for sensitive groups (AQI ${data.aqi})`);
    }

    // 4. UV Exposure Risk Calculation
    let uv_risk: ClimateRiskCategory = 'low';
    if (data.uv_index >= 11) {
      uv_risk = 'extreme';
      riskFactors.push(`Extreme UV radiation index (${data.uv_index})`);
    } else if (data.uv_index >= 8) {
      uv_risk = 'high';
      riskFactors.push(`Very High UV solar exposure (${data.uv_index})`);
    } else if (data.uv_index >= 6) {
      uv_risk = 'moderate';
      riskFactors.push(`High UV index (${data.uv_index})`);
    }

    // 5. Overall Combined Climate Risk Determination
    const categories: ClimateRiskCategory[] = [heat_risk, dehydration_risk, air_quality_risk, uv_risk];
    let overall_climate_risk: ClimateRiskCategory = 'low';

    if (categories.includes('extreme')) {
      overall_climate_risk = 'extreme';
    } else if (categories.filter((c) => c === 'high').length >= 1) {
      overall_climate_risk = 'high';
    } else if (categories.filter((c) => c === 'moderate').length >= 1) {
      overall_climate_risk = 'moderate';
    }

    return {
      heat_risk,
      dehydration_risk,
      air_quality_risk,
      uv_risk,
      overall_climate_risk,
      risk_factors: riskFactors,
    };
  }
}

export const healthRiskEngine = new HealthRiskEngine();
