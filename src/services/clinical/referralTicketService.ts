import { ClinicalReferralTicket, ClinicalRiskLevel } from './types';

export class ReferralTicketService {
  private tickets = new Map<string, ClinicalReferralTicket>();

  /**
   * Create a standardized, non-sensitive clinical referral ticket
   */
  createTicket(params: {
    userId: string;
    patientName: string;
    riskLevel: ClinicalRiskLevel;
    reasonCodes: string[];
    symptoms: string[];
  }): ClinicalReferralTicket {
    const ticketId = `TKT-DAYLI-${Math.floor(10000 + Math.random() * 90000)}`;
    const priority: 'routine' | 'urgent' | 'emergency' =
      params.riskLevel === 'emergency'
        ? 'emergency'
        : params.riskLevel === 'high'
        ? 'urgent'
        : 'routine';

    const ticket: ClinicalReferralTicket = {
      ticket_id: ticketId,
      user_id: params.userId,
      patient_name: params.patientName,
      risk_level: params.riskLevel,
      reason_codes: params.reasonCodes,
      symptoms: params.symptoms.length > 0 ? params.symptoms : ['Climate Heat Strain'],
      created_at: new Date().toISOString(),
      status: 'open',
      priority,
      source: 'ai_triage',
      facility_name: 'District Maternal & Pediatric Emergency Referral Center',
      doctor_assigned: 'On-Call OB-GYN & Pediatric Triage Specialist',
    };

    this.tickets.set(ticketId, ticket);
    return ticket;
  }

  getTicket(ticketId: string): ClinicalReferralTicket | undefined {
    return this.tickets.get(ticketId);
  }

  getAllTickets(): ClinicalReferralTicket[] {
    return Array.from(this.tickets.values());
  }
}

export const referralTicketService = new ReferralTicketService();
