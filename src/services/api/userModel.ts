export interface UserIdentity {
  user_id: string;
  phone_number: string;
  email?: string;
  role: 'user' | 'admin' | 'developer';
  created_at: string;
}

export interface UserProfileData {
  full_name: string;
  trimester?: string;
  is_pregnant: boolean;
  child_age?: string;
  location_name: string;
  latitude: number;
  longitude: number;
}

export interface UserConversationState {
  session_id: string;
  active_flow_id: string;
  last_interaction: string;
  recent_messages: Array<{ sender: string; content: string; timestamp: string }>;
}

export interface UserClinicalAssessment {
  assessment_id: string;
  timestamp: string;
  symptoms: string[];
  risk_level: string;
  reason_codes: string[];
}

export interface UserReferralRecord {
  referral_id: string;
  status: string;
  priority: string;
  facility_name: string;
  created_at: string;
}

export interface UserPreferences {
  language: string;
  preferred_channel: 'web' | 'whatsapp';
  opted_in_climate_alerts: boolean;
}

export interface CompleteUserAggregate {
  identity: UserIdentity;
  profile: UserProfileData;
  conversation: UserConversationState;
  clinical_assessments: UserClinicalAssessment[];
  referrals: UserReferralRecord[];
  preferences: UserPreferences;
}
