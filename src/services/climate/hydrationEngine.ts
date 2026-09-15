import { HydrationCalculation, NormalizedClimateData } from './types';
import { UserProfile } from '../../types/chatEngine';

export interface HydrationParams {
  climateData: NormalizedClimateData;
  userProfile?: UserProfile;
  weightKg?: number;
  activityLevel?: 'resting' | 'light' | 'moderate' | 'active';
}

export class HydrationEngine {
  /**
   * Deterministically calculate daily fluid hydration baseline and range
   */
  calculateHydration(params: HydrationParams): HydrationCalculation {
    const { climateData, userProfile, weightKg, activityLevel } = params;

    // 1. Baseline fluid requirement (35ml per kg, default ~2300ml for 65kg female)
    const weight = weightKg && weightKg > 30 && weightKg < 150 ? weightKg : 65;
    let baseMl = weight * 35; // e.g. 2275ml

    const reasons: string[] = [`Baseline body mass requirement (${Math.round(baseMl)}ml)`];

    // 2. Pregnancy & Lactation Physiological Fluid Surge
    const trimester = userProfile?.trimester || '';
    const isPregnant = userProfile?.isPregnant ?? true;

    if (isPregnant) {
      if (trimester.includes('3rd') || trimester.includes('Third')) {
        baseMl += 350;
        reasons.push('3rd Trimester blood volume & amniotic expansion (+350ml)');
      } else if (trimester.includes('2nd') || trimester.includes('Second')) {
        baseMl += 300;
        reasons.push('2nd Trimester placental fluid demand (+300ml)');
      } else {
        baseMl += 250;
        reasons.push('1st Trimester plasma expansion (+250ml)');
      }
    } else if (trimester.includes('Postpartum') || trimester.includes('Lactating')) {
      baseMl += 700;
      reasons.push('Postpartum lactation fluid replenishment (+700ml)');
    }

    // 3. Thermal Heat Loss Fluid Compensation
    const feelsC = climateData.feels_like_c;
    if (feelsC >= 45) {
      baseMl += 900;
      reasons.push('Extreme heat sweat loss compensation (+900ml)');
    } else if (feelsC >= 40) {
      baseMl += 700;
      reasons.push('High ambient heat thermal loss (+700ml)');
    } else if (feelsC >= 35) {
      baseMl += 450;
      reasons.push('Elevated temperature thermal loss (+450ml)');
    } else if (feelsC >= 30) {
      baseMl += 250;
      reasons.push('Warm weather fluid boost (+250ml)');
    }

    // 4. Physical Activity Adjustment
    if (activityLevel === 'active' || activityLevel === 'moderate') {
      baseMl += 400;
      reasons.push('Physical activity fluid replenishment (+400ml)');
    }

    const recommendedTargetMl = Math.round(baseMl / 100) * 100; // Round to nearest 100ml
    const minMl = Math.max(2000, recommendedTargetMl - 300);
    const maxMl = Math.min(5000, recommendedTargetMl + 300);

    const recommendedTargetLiters = Number((recommendedTargetMl / 1000).toFixed(1));

    return {
      recommended_target_ml: recommendedTargetMl,
      recommended_target_liters: recommendedTargetLiters,
      range_ml: {
        min: minMl,
        max: maxMl,
      },
      reason: reasons.join(' • '),
      disclaimer:
        '⚠️ *Guidance Disclaimer:* Hydration targets represent general climate health guidance based on ambient heat and physiological status. They are not medical prescriptions. Consult your healthcare provider for specific renal or cardiovascular restrictions.',
    };
  }
}

export const hydrationEngine = new HydrationEngine();
