import { MetaOutboundPayload, MetaWebhookEvent } from './metaApi';
import { UserProfile } from './chatEngine';

export interface WeatherData {
  cityName: string;
  temperatureC: number;
  feelsLikeC: number;
  humidityPercent: number;
  aqi: number; // Air Quality Index (1-500)
  aqiStatus: 'Good' | 'Moderate' | 'Unhealthy' | 'Severe' | 'Hazardous';
  uvIndex: number;
  weatherConditionText: string;
  heatWaveAdvisory: boolean;
  heatLevel: 'Normal' | 'Caution' | 'Extreme Caution' | 'Danger' | 'Extreme Danger';
  maternalRiskLevel: string;
  hydrationTargetLiters: number;
  recommendation: string;
  coolingAdvice: string;
}

export interface PatientRecord {
  patientId: string;
  name: string;
  phoneNumber: string;
  isPregnant: boolean;
  trimester?: string;
  childAgeCategory?: string;
  riskScore: 'Low' | 'Moderate' | 'High';
  referralId?: string;
  registeredAt: string;
  lastAdherenceDate?: string;
  adherenceRatePercent?: number;
}

export interface ReferralTicket {
  referralId: string;
  patientId: string;
  patientName: string;
  triageCategory: 'Low' | 'Moderate' | 'High / Emergency';
  symptoms: string[];
  facilityName: string;
  facilityAddress: string;
  coordinates: { latitude: number; longitude: number };
  doctorAssigned: string;
  status: 'Pending' | 'Confirmed' | 'Completed';
  createdAt: string;
}

export interface AnalyticsMetrics {
  totalConversationsStarted: number;
  activeWorkflowsCount: Record<string, number>;
  totalButtonsClicked: number;
  workflowCompletionRatePercent: number;
  averageCompletionTimeSeconds: number;
  totalReferralsGenerated: number;
  highRiskTriageCount: number;
  heatAdherenceNudgesSent: number;
}

/** Service interfaces for Phase 1 & Phase 2 live API integration */
export interface IWeatherService {
  getClimateHealthData(latitude: number, longitude: number, locationName?: string): Promise<WeatherData>;
}

export interface IPatientService {
  getPatientProfile(phoneNumber: string): Promise<PatientRecord | null>;
  savePatientProfile(profile: Partial<PatientRecord>): Promise<PatientRecord>;
  recordMedicationAdherence(patientId: string, medicationName: string, taken: boolean): Promise<boolean>;
}

export interface IReferralService {
  createTriageReferral(params: {
    patientId: string;
    patientName: string;
    symptoms: string[];
    riskScore: 'Low' | 'Moderate' | 'High';
  }): Promise<ReferralTicket>;
}

export interface IMetaMessagingService {
  sendMessage(payload: MetaOutboundPayload): Promise<{ message_id: string; status: 'accepted' }>;
  simulateWebhook(event: MetaWebhookEvent): void;
}

export interface INotificationService {
  scheduleAdherenceReminder(patientId: string, time: string, message: string): Promise<{ scheduleId: string }>;
}

export interface IAnalyticsService {
  trackEvent(eventName: string, properties?: Record<string, any>): void;
  getMetrics(): Promise<AnalyticsMetrics>;
}

export type AIIntent =
  | 'general_care'
  | 'clinical_triage'
  | 'medication_adherence'
  | 'weather_climate'
  | 'emergency'
  | 'unknown';

export interface StructuredTriageAssessment {
  symptoms: string[];
  redFlags: string[];
  duration?: string | null;
  severity?: 'mild' | 'moderate' | 'severe' | null;
  pregnancyContext?: string | null;
  childContext?: string | null;
  recommendedTriageLevel: 'low' | 'moderate' | 'high';
}

export interface ClinicalSafetyEvaluation {
  finalRiskLevel: 'Low' | 'Moderate' | 'High / Emergency';
  requiresReferral: boolean;
  redFlagsIdentified: string[];
  safetyNote: string;
  escalatedByRules: boolean;
  referralTicket?: ReferralTicket;
}

export interface AIOrchestrationMetadata {
  intent: AIIntent;
  riskLevel: 'Low' | 'Moderate' | 'High / Emergency';
  requiresReferral: boolean;
  response: string;
  actions: string[];
  sources: string[];
  confidence: number;
  latencyMs: number;
  tokensUsed?: number;
  modelUsed: string;
  fallbackUsed: boolean;
  promptVersion: string;
  structuredAssessment?: StructuredTriageAssessment;
  referralTicket?: ReferralTicket;
}

export interface OpenAIHealthCheckResult {
  isConfigured: boolean;
  source: 'env' | 'local' | 'none';
  selectedModel: string;
  maskedKey?: string;
  status: 'ok' | 'error';
  message: string;
}

export interface IOpenAIService {
  generateClimateAdvice(params: {
    userQuery: string;
    userProfile: UserProfile;
    weatherData?: WeatherData;
    model?: string;
    apiKey?: string;
  }): Promise<{ responseText: string; tokensUsed?: number; modelUsed: string; metadata?: AIOrchestrationMetadata }>;

  orchestrateQuery(params: {
    userQuery: string;
    userProfile: UserProfile;
    weatherData?: WeatherData;
    conversationState?: Record<string, any>;
    recentMessages?: Array<{ sender: string; content: string }>;
    model?: string;
    apiKey?: string;
  }): Promise<AIOrchestrationMetadata>;

  checkHealth(apiKey?: string, model?: string): Promise<OpenAIHealthCheckResult>;
}

