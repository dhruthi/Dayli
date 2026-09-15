import { AIIntent, AIOrchestrationMetadata } from '../../types/services';

export type RequestChannel = 'web' | 'whatsapp' | 'simulator';
export type UserRole = 'user' | 'admin' | 'developer';

export interface UniversalChatMessageInput {
  session_id: string;
  message: string;
  channel: RequestChannel;
  phone_number?: string;
  user_name?: string;
  location?: { latitude: number; longitude: number; name?: string };
}

export interface UniversalChatMessageOutput {
  message: string;
  intent: AIIntent;
  risk_level: 'Low' | 'Moderate' | 'High / Emergency';
  actions: string[];
  referral: {
    ticket_id: string;
    status: string;
    priority: string;
    facility_name: string;
  } | null;
  sources: string[];
  metadata: {
    latency_ms: number;
    model_used: string;
    fallback_used: boolean;
    channel: RequestChannel;
    prompt_version: string;
  };
}

export interface AuthTokenPayload {
  user_id: string;
  role: UserRole;
  phone_number: string;
  expires_at: number;
}

export interface DashboardSummaryResponse {
  user: {
    name: string;
    trimester?: string;
    location_name: string;
  };
  current_climate: {
    temperature_c: number;
    feels_like_c: number;
    aqi: number;
    aqi_status: string;
    uv_index: number;
    uv_status: string;
  };
  risk_assessment: {
    heat_risk: string;
    dehydration_risk: string;
    air_quality_risk: string;
    overall_climate_risk: string;
  };
  hydration_target: {
    target_liters: number;
    target_ml: number;
    disclaimer: string;
  };
  active_referral: {
    has_referral: boolean;
    ticket_id?: string;
    priority?: string;
    facility_name?: string;
  };
  recent_interactions_count: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}
