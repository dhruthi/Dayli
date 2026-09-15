import { FlowCondition } from '../types/chatEngine';

/** Default fallback map for dynamic variables to ensure text never displays 'undefined' or blank */
const DEFAULT_VARIABLE_FALLBACKS: Record<string, string> = {
  'userProfile.name': 'Ananya Sharma',
  'userProfile.trimester': '2nd Trimester',
  'userProfile.locationName': 'New Delhi Central',
  'weatherData.temperatureC': '41.5',
  'weatherData.feelsLikeC': '46.2',
  'weatherData.aqi': '184',
  'weatherData.aqiStatus': 'Unhealthy',
  'weatherData.hydrationTargetLiters': '3.5',
  'supplement': 'Iron & Folic Acid (IFA)',
  'referralTicket.referralId': 'REF-CLIMATE-884201',
  'referralTicket.facilityName': 'City Maternal Emergency & Heat Triage Center',
  'referralTicket.facilityAddress': 'Sector 12, Healthcare Boulevard',
  'referralTicket.doctorAssigned': 'Dr. Kavita Sharma',
};

/** Utility to interpolate mustache syntax {{var.path}} in templates/text */
export function interpolateVariables(template: string, variables: Record<string, any>): string {
  if (!template) return '';
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
    const value = getNestedValue(variables, path);
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value);
    }
    return DEFAULT_VARIABLE_FALLBACKS[path] || '';
  });
}

/** Retrieve nested object property safely (e.g. weatherData.temperatureC) */
export function getNestedValue(obj: Record<string, any>, path: string): any {
  if (!obj || !path) return undefined;
  const keys = path.split('.');
  let current: any = obj;
  for (const key of keys) {
    if (current === undefined || current === null) return undefined;
    current = current[key];
  }
  return current;
}

/** Evaluate dynamic condition expression */
export function evaluateCondition(condition: FlowCondition, variables: Record<string, any>): boolean {
  const actualValue = getNestedValue(variables, condition.variable);
  const targetValue = condition.value;

  switch (condition.operator) {
    case 'equals':
      return String(actualValue) === String(targetValue);
    case 'not_equals':
      return String(actualValue) !== String(targetValue);
    case 'greater_than':
      return Number(actualValue) > Number(targetValue);
    case 'less_than':
      return Number(actualValue) < Number(targetValue);
    case 'contains':
      return String(actualValue).toLowerCase().includes(String(targetValue).toLowerCase());
    case 'truthy':
      return Boolean(actualValue);
    default:
      return false;
  }
}
