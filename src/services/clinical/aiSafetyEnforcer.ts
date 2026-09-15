import { ClinicalSafetyResult } from './types';
import { SubjectType } from '../ai/intentRouter';

export class AISafetyEnforcer {
  /**
   * Enforce clinical safety constraints & response validation rules on AI outputs
   */
  enforce(params: {
    rawAiResponse: string;
    safetyResult: ClinicalSafetyResult;
    userProfileName: string;
    locationName?: string;
    temperatureC?: number;
    subjectType?: SubjectType;
    intent?: string;
  }): { sanitizedResponse: string; requiresImmediateAction: boolean } {
    const { safetyResult, userProfileName, locationName, temperatureC, subjectType, intent } = params;
    const isPediatric = subjectType === 'infant' || subjectType === 'child';

    // 1. EMERGENCY OVERRIDE (Safety Level 4)
    if (safetyResult.risk_level === 'emergency') {
      const redFlagsText =
        safetyResult.red_flags.length > 0
          ? safetyResult.red_flags.join(', ')
          : 'Severe Acute Warning Symptoms';

      const emergencyNotice = `🚨 *CLINICAL EMERGENCY ALERT for ${userProfileName}*\n\nYour reported symptoms (${redFlagsText}) indicate immediate high-risk clinical urgency under ambient heat in *${locationName || 'your area'}* (${temperatureC || 41.5}°C).\n\n🏥 *URGENT ACTION REQUIRED:*
1. ${isPediatric ? 'Move your baby to a cool, well-ventilated shaded room immediately.' : 'Lie down immediately in a cool, shaded area on your left side.'}
2. ${isPediatric ? 'Offer frequent breastfeeds/formula or small sips of ORS if over 6 months.' : 'Sip 200ml cool water mixed with 1 sachet ORS.'}
3. Apply cool damp cloths to wrists and nape of neck.
4. **PROCEED TO THE NEAREST HOSPITAL OR EMERGENCY TRIAGE IMMEDIATELY.**

${
  safetyResult.referral_ticket
    ? `🎫 *PRIORITY REFERRAL TICKET GENERATED*
• *Ticket ID:* \`${safetyResult.referral_ticket.ticket_id}\`
• *Priority:* EMERGENCY QUEUE
• *Facility:* ${safetyResult.referral_ticket.facility_name}
• *Assigned:* ${safetyResult.referral_ticket.doctor_assigned}`
    : 'Hospital referral ticket generated. Visit emergency triage immediately.'
}`;

      return {
        sanitizedResponse: emergencyNotice,
        requiresImmediateAction: true,
      };
    }

    // 2. HIGH RISK REFERRAL OVERRIDE
    if (safetyResult.risk_level === 'high') {
      const highRiskNotice = `⚠️ *CLINICAL TRIAGE ADVISORY for ${userProfileName}*\n\n${params.rawAiResponse}\n\n🚨 *Clinical Action:* Due to elevated risk (${safetyResult.reason_codes.join(', ')}), an urgent health clinic referral has been created (\`${safetyResult.referral_ticket?.ticket_id || 'OPEN'}\`). Please visit a healthcare provider today.`;

      return {
        sanitizedResponse: highRiskNotice,
        requiresImmediateAction: false,
      };
    }

    // 3. RESPONSE VALIDATION FOR PEDIATRIC & CLINICAL CONCERNS
    let cleanedText = params.rawAiResponse;

    // Rule A: Never allow adult hydration targets (e.g. 3.5 Liters) for infants/children!
    if (isPediatric) {
      cleanedText = cleanedText.replace(/drink \d+(?:\.\d+)?\s*(?:l|liters?|litres?)\b/gi, 'maintain regular breastfeeds or small frequent sips');
      cleanedText = cleanedText.replace(/hydration target:\s*\d+(?:\.\d+)?\s*L/gi, 'Hydration: Frequent feeds/sips');
    }

    // Rule B: Remove diagnostic certainty or hallucinated drug dosages
    cleanedText = cleanedText.replace(/take \d+ mg of [a-z]+/gi, 'consult your doctor for medication dosing');
    cleanedText = cleanedText.replace(/you definitely have [a-z]+/gi, 'your symptoms may be related to');

    // Rule C: Validate that clinical_triage queries did NOT get reduced to a generic weather template
    if ((intent === 'clinical_triage' || isPediatric) && cleanedText.includes('HEAT & CLIMATE HEALTH GUIDANCE')) {
      cleanedText = `I understand you have reported a physical health symptom or injury, ${userProfileName}.\n\n` +
        `• *Immediate Recommendation:* For acute symptoms, pain, or injuries, please seek evaluation at your nearest health clinic or emergency department.\n` +
        `• *First Aid:* Rest in a comfortable position, avoid strain on injured limbs, and apply cool compresses if swollen.\n` +
        `• *Hydration:* Stay hydrated with clean water and ORS electrolytes.`;
    }

    return {
      sanitizedResponse: cleanedText,
      requiresImmediateAction: false,
    };
  }
}

export const aiSafetyEnforcer = new AISafetyEnforcer();
