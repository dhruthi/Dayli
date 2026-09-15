import {
  NormalizedClimateData,
  HealthRiskAssessment,
  StructuredClimateAdvice,
  HydrationCalculation,
} from './types';
import { UserProfile } from '../../types/chatEngine';

export class ClimateAdviceEngine {
  /**
   * Deterministically assemble structured personalized climate health recommendations
   */
  generateAdvice(params: {
    climateData: NormalizedClimateData;
    riskAssessment: HealthRiskAssessment;
    hydration: HydrationCalculation;
    userProfile: UserProfile;
  }): StructuredClimateAdvice {
    const { climateData, riskAssessment, hydration, userProfile } = params;
    const recommendations: string[] = [];
    const avoid: string[] = [];
    const monitor: string[] = [];

    // Priority Determination
    let priority: 'low' | 'moderate' | 'high' | 'critical' = 'low';
    if (riskAssessment.overall_climate_risk === 'extreme') {
      priority = 'critical';
    } else if (riskAssessment.overall_climate_risk === 'high') {
      priority = 'high';
    } else if (riskAssessment.overall_climate_risk === 'moderate') {
      priority = 'moderate';
    }

    // 1. Heat & Dehydration Recommendations
    recommendations.push(
      `Target ${hydration.recommended_target_liters} Liters of fluid today (${hydration.recommended_target_ml}ml), sipping small amounts regularly.`
    );
    recommendations.push('Add 1 sachet of ORS (Oral Rehydration Salts) or coconut water to replenish electrolytes.');
    recommendations.push('Apply damp cool towels to forehead, wrists, and nape of neck for active skin cooling.');

    avoid.push('Direct sun exposure during peak heat hours (11:00 AM - 4:00 PM).');
    avoid.push('Heavy, oily meals and caffeinated beverages that exacerbate dehydration.');

    // 2. Air Pollution Recommendations
    if (climateData.aqi >= 200) {
      recommendations.push(`AQI is ${climateData.aqi} (${climateData.aqi_status}). Keep window drapes damp and wear N95 mask outdoors.`);
      avoid.push('Outdoor walking or strenuous physical activity during high AQI hours.');
    } else if (climateData.aqi >= 101) {
      recommendations.push(`Air quality is ${climateData.aqi} (${climateData.aqi_status}). Limit prolonged outdoor exposure.`);
    }

    // 3. UV Index Recommendations
    if (climateData.uv_index >= 8) {
      recommendations.push(`UV Index is ${climateData.uv_index} (${climateData.uv_status}). Wear wide-brimmed hat or umbrella outdoors.`);
      avoid.push('Unprotected skin exposure to direct solar radiation.');
    }

    // 4. Maternal & Child Monitoring Parameters
    monitor.push('Track urine color: pale straw yellow indicates safe hydration level.');

    const isPregnant = userProfile.isPregnant ?? true;
    if (isPregnant) {
      monitor.push('Monitor fetal kick counts carefully (expect ~10 kicks in 2 hours when resting).');
      monitor.push('Watch for severe heat signs: dizziness, nausea, reduced kicks, or persistent headache.');
    } else {
      monitor.push('Watch for pediatric heat strain: irritability, flushed skin, dry lips, or poor feeding.');
    }

    return {
      priority,
      recommendations,
      avoid,
      monitor,
    };
  }
}

export const climateAdviceEngine = new ClimateAdviceEngine();
