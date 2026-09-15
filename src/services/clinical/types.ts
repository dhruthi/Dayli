export type ClinicalRiskLevel = 'low' | 'moderate' | 'high' | 'emergency';

export interface RedFlagRule {
  id: string;
  name: string;
  category: 'fetal_distress' | 'cns_heatstroke' | 'maternal_severe' | 'pediatric_heat';
  description: string;
  reasonCode: string;
  riskLevel: ClinicalRiskLevel;
  evaluate: (symptoms: string[], textQuery: string, userProfile?: any) => boolean;
}

export interface ClinicalSafetyResult {
  risk_level: ClinicalRiskLevel;
  red_flags: string[];
  requires_referral: boolean;
  requires_immediate_action: boolean;
  reason_codes: string[];
  rule_version: string;
  referral_ticket?: ClinicalReferralTicket;
}

export interface ClinicalReferralTicket {
  ticket_id: string;
  user_id: string;
  patient_name: string;
  risk_level: ClinicalRiskLevel;
  reason_codes: string[];
  symptoms: string[];
  created_at: string;
  status: 'open' | 'closed' | 'referred';
  priority: 'routine' | 'urgent' | 'emergency';
  source: 'ai_triage';
  facility_name: string;
  doctor_assigned: string;
}

export interface ClinicalAuditEntry {
  request_id: string;
  timestamp: string;
  rule_version: string;
  risk_level: ClinicalRiskLevel;
  reason_codes: string[];
  symptoms_noted: string[];
  requires_referral: boolean;
  requires_immediate_action: boolean;
  ticket_id?: string;
  overridden_by_llm: false; // Guarantee
}
