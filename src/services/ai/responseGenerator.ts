import { ClinicalSafetyEvaluation } from '../../types/services';
import { AIContext } from './contextBuilder';

export class ResponseGenerator {
  generateFinalResponse(params: {
    intent: string;
    agentResponse: string;
    safetyEvaluation: ClinicalSafetyEvaluation;
    context: AIContext;
  }): { text: string; actions: string[]; sources: string[] } {
    const { finalRiskLevel, referralTicket, redFlagsIdentified } = params.safetyEvaluation;
    const actions: string[] = [];
    const sources: string[] = ['WHO Heatwaves & Health Guidelines', 'UNICEF Maternal Climate Guidelines'];

    let text = params.agentResponse;

    // Emergency Override if High Risk / Emergency detected by Safety Layer
    if (finalRiskLevel === 'High / Emergency') {
      actions.push('EMERGENCY_HOSPITAL_REFERRAL');
      actions.push('SCHEDULE_URGENT_FOLLOWUP');

      const redFlagsStr = redFlagsIdentified.length > 0 ? redFlagsIdentified.join(', ') : 'Severe Heat Stress / Red-Flag Symptoms';

      text = `🚨 *CLINICAL EMERGENCY ALERT for ${params.context.userProfile.name}*\n\nYour symptoms (${redFlagsStr}) indicate high clinical risk under ambient heat in *${params.context.userProfile.locationName}* (${params.context.climateContext.temperatureC}°C).\n\n🏥 *Emergency Action Steps:*
1. Move to a shaded, air-conditioned room or cool space immediately.
2. Lie down on your left side to maximize placental blood flow.
3. Sip cool water mixed with 1 sachet ORS.
4. **Proceed to the nearest healthcare facility immediately.**

${
  referralTicket
    ? `🎫 *URGENT REFERRAL TICKET GENERATED*
• *Ticket ID:* \`${referralTicket.referralId}\`
• *Assigned Facility:* ${referralTicket.facilityName} (${referralTicket.facilityAddress})
• *Assigned Doctor:* ${referralTicket.doctorAssigned}
• *Status:* Priority Emergency Queue`
    : 'Hospital referral ticket generated. Please visit emergency triage.'
}`;
    } else if (finalRiskLevel === 'Moderate') {
      actions.push('MONITOR_SYMPTOMS_2_HOURS');
      actions.push('ORS_HYDRATION_NUDGE');
      text = `⚠️ *CLINICAL HEAT ADVISORY for ${params.context.userProfile.name}*\n\n${text}\n\n• *Next Steps:* Re-assess symptoms in 2 hours. If dizziness or nausea worsens, tap *🚨 Clinical Triage* immediately.`;
    } else {
      actions.push('ROUTINE_HYDRATION_CHECK');
    }

    return { text, actions, sources };
  }
}

export const responseGenerator = new ResponseGenerator();
