/**
 * Type surface for the shared deterministic safety core.
 * Implementation lives in ./safetyCore.js — plain ESM, so any Node caller runs
 * the same rules without a build step.
 */

export type SubjectType =
  | 'adult'
  | 'pregnant_person'
  | 'postpartum_person'
  | 'infant'
  | 'child'
  | 'unknown';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'emergency';

export interface SafetySignals {
  breathingDifficulty?: boolean;
  cyanosis?: boolean;
  unresponsive?: boolean;
  seizure?: boolean;
  severeBleeding?: boolean;
  vaginalBleeding?: boolean;
  reducedFetalMovement?: boolean;
  fluidLeak?: boolean;
  preeclampsiaSigns?: boolean;
  heatStroke?: boolean;
  chestPain?: boolean;
  fever?: boolean;
  dehydration?: boolean;
  poorFeeding?: boolean;
  selfHarm?: boolean;
  temperatureC?: number;
  severity?: 'mild' | 'moderate' | 'severe' | null;
}

export interface SafetyProfile {
  subjectType?: SubjectType;
  isPregnant?: boolean;
  ageMonths?: number;
}

export interface ClimateSnapshot {
  temperature_c?: number | null;
  feels_like_c?: number | null;
  aqi?: number | null;
  uv_index?: number | null;
}

export interface SafetyEvaluation {
  riskLevel: RiskLevel;
  subject: SubjectType;
  ageMonths: number | null;
  redFlags: string[];
  reasonCodes: string[];
  requiresReferral: boolean;
  requiresImmediateAction: boolean;
  emergencyActions: string[];
  constraints: string[];
  ruleVersion: string;
}

export interface SafetyRule {
  id: string;
  code: string;
  label: string;
  risk: RiskLevel;
  subjects: SubjectType[] | null;
  test: (ctx: unknown) => boolean;
}

export declare const SAFETY_RULE_VERSION: string;
export declare const SUBJECT_TYPES: SubjectType[];
export declare const PEDIATRIC_SUBJECTS: string[];
export declare const RULES: SafetyRule[];

export declare function extractStatedTemperatureC(text: string): number | null;
export declare function extractAgeMonths(text: string): number | null;

export declare function resolveSubject(
  text: string,
  profile?: SafetyProfile
): { subject: SubjectType; ageMonths: number | null; confidence: number };

export declare function evaluateSafety(params: {
  text: string;
  subject?: SubjectType;
  signals?: SafetySignals;
  profile?: SafetyProfile;
  climate?: ClimateSnapshot | null;
}): SafetyEvaluation;

export declare function buildConstraints(
  subject: SubjectType,
  ageMonths: number | null,
  text: string,
  reasonCodes?: string[]
): string[];

export declare function composeSafeResponse(params: {
  safety: SafetyEvaluation;
  modelText: string;
  disclaimer?: boolean;
}): string;

export declare function validateModelOutput(params: {
  text: string;
  safety: SafetyEvaluation;
}): { text: string; violations: string[] };

declare const _default: {
  SAFETY_RULE_VERSION: string;
  RULES: SafetyRule[];
  resolveSubject: typeof resolveSubject;
  evaluateSafety: typeof evaluateSafety;
  buildConstraints: typeof buildConstraints;
  composeSafeResponse: typeof composeSafeResponse;
  validateModelOutput: typeof validateModelOutput;
  extractStatedTemperatureC: typeof extractStatedTemperatureC;
  extractAgeMonths: typeof extractAgeMonths;
};
export default _default;
