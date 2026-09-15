import { IPatientService, PatientRecord } from '../interfaces';

export class MockPatientService implements IPatientService {
  private patientsStore: Map<string, PatientRecord> = new Map();

  constructor() {
    // Seed initial mock patient
    this.patientsStore.set('+919876543210', {
      patientId: 'PAT-DAYLI-8842',
      name: 'Ananya Sharma',
      phoneNumber: '+919876543210',
      isPregnant: true,
      trimester: '2nd Trimester (Weeks 14-27)',
      childAgeCategory: undefined,
      riskScore: 'Moderate',
      registeredAt: new Date(Date.now() - 86400000 * 14).toISOString(),
      adherenceRatePercent: 92,
    });
  }

  async getPatientProfile(phoneNumber: string): Promise<PatientRecord | null> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return this.patientsStore.get(phoneNumber) || null;
  }

  async savePatientProfile(profile: Partial<PatientRecord>): Promise<PatientRecord> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const phone = profile.phoneNumber || '+919876543210';
    const existing = this.patientsStore.get(phone) || {
      patientId: `PAT-DAYLI-${Math.floor(1000 + Math.random() * 9000)}`,
      name: profile.name || 'Dayli User',
      phoneNumber: phone,
      isPregnant: true,
      riskScore: 'Low',
      registeredAt: new Date().toISOString(),
    };

    const updated: PatientRecord = {
      ...existing,
      ...profile,
    };

    this.patientsStore.set(phone, updated);
    return updated;
  }

  async recordMedicationAdherence(patientId: string, medicationName: string, taken: boolean): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    for (const [phone, record] of this.patientsStore.entries()) {
      if (record.patientId === patientId || patientId === 'PAT-DAYLI-8842') {
        record.lastAdherenceDate = new Date().toISOString();
        record.adherenceRatePercent = taken
          ? Math.min(100, (record.adherenceRatePercent || 85) + 5)
          : Math.max(0, (record.adherenceRatePercent || 85) - 10);
        this.patientsStore.set(phone, record);
        return true;
      }
    }
    return true;
  }
}

export const patientService = new MockPatientService();
