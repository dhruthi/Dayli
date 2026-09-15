import { IReferralService, ReferralTicket } from '../interfaces';

export class MockReferralService implements IReferralService {
  private referrals: ReferralTicket[] = [];

  async createTriageReferral(params: {
    patientId: string;
    patientName: string;
    symptoms: string[];
    riskScore: 'Low' | 'Moderate' | 'High';
  }): Promise<ReferralTicket> {
    await new Promise((resolve) => setTimeout(resolve, 700));

    const referralId = `REF-CLIMATE-${Math.floor(100000 + Math.random() * 900000)}`;
    const isHigh = params.riskScore === 'High';

    const ticket: ReferralTicket = {
      referralId,
      patientId: params.patientId,
      patientName: params.patientName,
      triageCategory: isHigh ? 'High / Emergency' : params.riskScore === 'Moderate' ? 'Moderate' : 'Low',
      symptoms: params.symptoms,
      facilityName: isHigh ? 'City Maternal Emergency & Heat Triage Center' : 'Community Primary Health Center #4',
      facilityAddress: isHigh ? '742 Healthcare Boulevard, Sector 12' : '108 Wellness Avenue, Block B',
      coordinates: { latitude: 28.6139, longitude: 77.209 },
      doctorAssigned: isHigh ? 'Dr. Kavita Sharma (OB-GYN / Climate Emergency Lead)' : 'Dr. Rajesh Verma',
      status: 'Confirmed',
      createdAt: new Date().toISOString(),
    };

    this.referrals.push(ticket);
    return ticket;
  }
}

export const referralService = new MockReferralService();
