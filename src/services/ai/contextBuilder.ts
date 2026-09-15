import { UserProfile } from '../../types/chatEngine';
import { WeatherData } from '../../types/services';
import { SubjectType } from './intentRouter';

export interface AIContext {
  userProfile: {
    name: string;
    trimester?: string;
    isPregnant?: boolean;
    childAgeCategory?: string;
    locationName: string;
  };
  subjectType: SubjectType;
  climateContext: {
    temperatureC?: number;
    feelsLikeC?: number;
    aqi?: number;
    aqiStatus?: string;
    uvIndex?: number;
    heatLevel?: string;
    hydrationTargetLiters?: number | null; // Null for infants/children to prevent adult dosing errors
    recommendation?: string;
  };
  recentMessages: Array<{ sender: string; content: string }>;
  formattedPromptContext: string;
}

export function buildAIContext(params: {
  userProfile: UserProfile;
  weatherData?: WeatherData;
  conversationState?: Record<string, any>;
  recentMessages?: Array<{ sender: string; content: string }>;
  subjectType?: SubjectType;
}): AIContext {
  const subjectType: SubjectType = params.subjectType || 'unknown';
  const isPediatric = subjectType === 'infant' || subjectType === 'child';

  const profileSummary = {
    name: params.userProfile.name || 'User',
    trimester: params.userProfile.trimester || '2nd Trimester',
    isPregnant: params.userProfile.isPregnant ?? true,
    childAgeCategory: params.userProfile.childAge,
    locationName: params.userProfile.locationName || 'New Delhi Central',
  };

  const climateSummary = {
    temperatureC: params.weatherData?.temperatureC ?? 41.5,
    feelsLikeC: params.weatherData?.feelsLikeC ?? 45.2,
    aqi: params.weatherData?.aqi ?? 185,
    aqiStatus: params.weatherData?.aqiStatus ?? 'Unhealthy',
    uvIndex: params.weatherData?.uvIndex ?? 9,
    heatLevel: params.weatherData?.heatLevel ?? 'Extreme Caution',
    // Omit adult hydration target for infants/children!
    hydrationTargetLiters: isPediatric ? null : (params.weatherData?.hydrationTargetLiters ?? 3.5),
    recommendation: params.weatherData?.recommendation ?? 'Avoid direct sun between 11 AM - 4 PM',
  };

  const recentMsgs = (params.recentMessages || []).slice(-3);

  const formattedPromptContext = `
USER CONTEXT:
- Caregiver/Mother Name: ${profileSummary.name}
- Subject Type: ${subjectType.toUpperCase()}
- Maternal Stage: ${profileSummary.trimester || 'Maternal Health'}
- Location: ${profileSummary.locationName}

ENVIRONMENTAL CLIMATE CONTEXT (${profileSummary.locationName}):
- Temperature: ${climateSummary.temperatureC}°C (Feels like ${climateSummary.feelsLikeC}°C)
- Heat Level: ${climateSummary.heatLevel}
- AQI: ${climateSummary.aqi} (${climateSummary.aqiStatus})
- UV Index: ${climateSummary.uvIndex}
${isPediatric ? '- Hydration Note: DO NOT give adult liter targets to infants/children. Breastfeed/formula frequently or small frequent sips for toddlers.' : `- Hydration Target: ${climateSummary.hydrationTargetLiters} Liters/day`}
- Area Notice: ${climateSummary.recommendation}
`.trim();

  return {
    userProfile: profileSummary,
    subjectType,
    climateContext: climateSummary,
    recentMessages: recentMsgs,
    formattedPromptContext,
  };
}
