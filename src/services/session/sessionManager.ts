import { ExtendedUserProfile, profileService } from '../profile/profileService';

export interface PersistentSession {
  userId: string;
  phoneNumber: string;
  profile: ExtendedUserProfile;
  conversationState: Record<string, any>;
  activeFlowId: string;
  currentNodeId: string | null;
  lastInteractionTimestamp: string;
  recentMessages: Array<{ sender: string; content: string; timestamp: string }>;
  location?: { latitude: number; longitude: number; name?: string };
  referralStatus?: {
    hasReferral: boolean;
    referralId?: string;
    riskScore?: string;
  };
}

export class SessionManager {
  private sessions = new Map<string, PersistentSession>();

  getSession(phoneNumber: string): PersistentSession {
    const key = (phoneNumber || '+919876543210').trim();
    const existing = this.sessions.get(key);
    if (existing) return existing;

    const profile = profileService.getProfile(key);
    const newSession: PersistentSession = {
      userId: profile.userId,
      phoneNumber: key,
      profile,
      conversationState: {},
      activeFlowId: 'general-care',
      currentNodeId: 'start_welcome_template',
      lastInteractionTimestamp: new Date().toISOString(),
      recentMessages: [],
      location: {
        latitude: profile.latitude || 28.6139,
        longitude: profile.longitude || 77.209,
        name: profile.locationName || 'New Delhi Central',
      },
    };

    this.sessions.set(key, newSession);
    return newSession;
  }

  updateSession(phoneNumber: string, updates: Partial<PersistentSession>): PersistentSession {
    const session = this.getSession(phoneNumber);
    const updated: PersistentSession = {
      ...session,
      ...updates,
      lastInteractionTimestamp: new Date().toISOString(),
    };
    this.sessions.set(phoneNumber.trim(), updated);
    return updated;
  }

  addMessageToHistory(phoneNumber: string, sender: 'user' | 'bot', content: string): void {
    const session = this.getSession(phoneNumber);
    const history = [...session.recentMessages, { sender, content, timestamp: new Date().toISOString() }].slice(-10);
    this.updateSession(phoneNumber, { recentMessages: history });
  }

  clearSession(phoneNumber: string): void {
    this.sessions.delete(phoneNumber.trim());
  }
}

export const sessionManager = new SessionManager();
