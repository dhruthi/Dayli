import { ClinicalSafetyResult, ClinicalRiskLevel } from './types';
import { RED_FLAG_RULES, RED_FLAG_RULE_VERSION } from './redFlagRules';
import { referralTicketService } from './referralTicketService';
import { clinicalAuditLogger } from './clinicalAuditLogger';
import { UserProfile } from '../../types/chatEngine';
import { NormalizedClimateData } from '../climate/types';

export class ClinicalSafetyEngine {
  /**
   * Deterministically evaluate clinical safety rules and enforce non-overridable risk scores
   */
  evaluate(params: {
    symptoms?: string[];
    userQuery: string;
    userProfile: UserProfile;
    climateExposure?: NormalizedClimateData;
    requestId?: string;
  }): ClinicalSafetyResult {
    const reqId = params.requestId || `req_cl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const symptoms = params.symptoms || [];
    const text = params.userQuery || '';

    const triggeredRedFlags: string[] = [];
    const reasonCodes: string[] = [];
    let highestRisk: ClinicalRiskLevel = 'low';

    // 1. Evaluate Explicit Red-Flag Rule Registry (v1.0.0)
    for (const rule of RED_FLAG_RULES) {
      if (rule.evaluate(symptoms, text, params.userProfile)) {
        triggeredRedFlags.push(rule.name);
        reasonCodes.push(rule.reasonCode);

        if (rule.riskLevel === 'emergency') {
          highestRisk = 'emergency';
        } else if (rule.riskLevel === 'high' && highestRisk !== 'emergency') {
          highestRisk = 'high';
        } else if (rule.riskLevel === 'moderate' && highestRisk === 'low') {
          highestRisk = 'moderate';
        }
      }
    }

    // 2. Evaluate Ambient Climate Exposure Thermal Strain
    if (params.climateExposure) {
      if (params.climateExposure.feels_like_c >= 45 || params.climateExposure.temperature_c >= 42) {
        if (!reasonCodes.includes('EXTREME_HEAT_EXPOSURE')) {
          reasonCodes.push('EXTREME_HEAT_EXPOSURE');
          if (highestRisk === 'low' || highestRisk === 'moderate') {
            highestRisk = 'high';
          }
        }
      }
    }

    const requiresReferral = highestRisk === 'emergency' || highestRisk === 'high';
    const requiresImmediateAction = highestRisk === 'emergency';

    // 3. Create Ticket if Referral Required
    let ticket = undefined;
    if (requiresReferral) {
      ticket = referralTicketService.createTicket({
        userId: params.userProfile.phoneNumber || 'PAT-UNKNOWN',
        patientName: params.userProfile.name || 'Patient',
        riskLevel: highestRisk,
        reasonCodes,
        symptoms,
      });
    }

    // 4. Record Non-Sensitive Audit Trail
    clinicalAuditLogger.logAudit({
      requestId: reqId,
      ruleVersion: RED_FLAG_RULE_VERSION,
      riskLevel: highestRisk,
      reasonCodes,
      symptomsNoted: symptoms,
      requiresReferral,
      requiresImmediateAction,
      ticketId: ticket?.ticket_id,
    });

    return {
      risk_level: highestRisk,
      red_flags: triggeredRedFlags,
      requires_referral: requiresReferral,
      requires_immediate_action: requiresImmediateAction,
      reason_codes: reasonCodes,
      rule_version: RED_FLAG_RULE_VERSION,
      referral_ticket: ticket,
    };
  }
}

export const clinicalSafetyEngine = new ClinicalSafetyEngine();
