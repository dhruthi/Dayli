import {
  ClinicalSafetyEvaluation,
  StructuredTriageAssessment,
  ReferralTicket,
} from '../../types/services';
import { UserProfile } from '../../types/chatEngine';
import { clinicalSafetyEngine } from '../clinical/clinicalSafetyEngine';

export class SafetyLayer {
  /**
   * Evaluate clinical risk using ClinicalSafetyEngine v1.0.0 rule registry
   */
  async evaluate(params: {
    intent: string;
    userQuery: string;
    assessment?: StructuredTriageAssessment;
    userProfile: UserProfile;
  }): Promise<ClinicalSafetyEvaluation> {
    const symptoms = params.assessment?.symptoms || [];
    const safetyResult = clinicalSafetyEngine.evaluate({
      symptoms,
      userQuery: params.userQuery,
      userProfile: params.userProfile,
    });

    let legacyRiskLevel: 'Low' | 'Moderate' | 'High / Emergency' = 'Low';
    if (safetyResult.risk_level === 'emergency' || safetyResult.risk_level === 'high') {
      legacyRiskLevel = 'High / Emergency';
    } else if (safetyResult.risk_level === 'moderate') {
      legacyRiskLevel = 'Moderate';
    }

    let legacyTicket: ReferralTicket | undefined = undefined;
    if (safetyResult.referral_ticket) {
      legacyTicket = {
        referralId: safetyResult.referral_ticket.ticket_id,
        patientId: safetyResult.referral_ticket.user_id,
        patientName: safetyResult.referral_ticket.patient_name,
        triageCategory: 'High / Emergency',
        symptoms: safetyResult.referral_ticket.symptoms,
        facilityName: safetyResult.referral_ticket.facility_name,
        facilityAddress: 'District Emergency Center',
        coordinates: { latitude: 28.6139, longitude: 77.209 },
        doctorAssigned: safetyResult.referral_ticket.doctor_assigned,
        status: 'Confirmed',
        createdAt: safetyResult.referral_ticket.created_at,
      };
    }

    return {
      finalRiskLevel: legacyRiskLevel,
      requiresReferral: safetyResult.requires_referral,
      redFlagsIdentified: safetyResult.red_flags,
      safetyNote: `[Rule Engine v${safetyResult.rule_version}] Reasons: ${safetyResult.reason_codes.join(', ') || 'Routine'}`,
      escalatedByRules: safetyResult.risk_level === 'emergency' || safetyResult.risk_level === 'high',
      referralTicket: legacyTicket,
    };
  }
}

export const safetyLayer = new SafetyLayer();
