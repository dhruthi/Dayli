import { UserProfile } from '../../types/chatEngine';

export interface ExtendedUserProfile extends UserProfile {
  userId: string;
  createdAt: string;
  updatedAt: string;
  riskHistory?: Array<{ date: string; riskScore: string }>;
  metadata?: Record<string, any>;
}

export class ProfileService {
  private profiles = new Map<string, ExtendedUserProfile>();

  getProfile(phoneNumber: string): ExtendedUserProfile {
    const key = (phoneNumber || '+919876543210').trim();
    const existing = this.profiles.get(key);
    if (existing) return existing;

    const defaultProf: ExtendedUserProfile = {
      userId: `usr_${key.replace(/[^0-9]/g, '')}`,
      name: 'Ananya Sharma',
      phoneNumber: key,
      language: 'en',
      trimester: '2nd Trimester',
      isPregnant: true,
      locationName: 'New Delhi Central',
      latitude: 28.6139,
      longitude: 77.209,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {},
    };

    this.profiles.set(key, defaultProf);
    return defaultProf;
  }

  saveProfile(phoneNumber: string, updates: Partial<ExtendedUserProfile>): ExtendedUserProfile {
    const key = (phoneNumber || '+919876543210').trim();
    const current = this.getProfile(key);
    const updated: ExtendedUserProfile = {
      ...current,
      ...updates,
      metadata: {
        ...(current.metadata || {}),
        ...(updates.metadata || {}),
      },
      updatedAt: new Date().toISOString(),
    };
    this.profiles.set(key, updated);
    return updated;
  }
}

export const profileService = new ProfileService();
