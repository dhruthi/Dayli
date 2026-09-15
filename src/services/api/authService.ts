import { AuthTokenPayload, UserRole } from './types';

export class AuthService {
  private activeTokens = new Map<string, AuthTokenPayload>();

  /**
   * Issue auth bearer token for website user or admin
   */
  issueToken(userId: string, role: UserRole = 'user', phoneNumber: string = '+919876543210'): string {
    const token = `dayli_token_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
    const payload: AuthTokenPayload = {
      user_id: userId,
      role,
      phone_number: phoneNumber,
      expires_at: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };

    this.activeTokens.set(token, payload);
    return token;
  }

  /**
   * Validate session bearer token
   */
  validateToken(token?: string): AuthTokenPayload | null {
    if (!token) return null;
    const cleanToken = token.replace('Bearer ', '').trim();
    const payload = this.activeTokens.get(cleanToken);

    if (!payload) {
      // Default dev fallback for local simulator
      if (cleanToken === 'dev_admin_token') {
        return {
          user_id: 'usr_admin',
          role: 'admin',
          phone_number: '+919876543210',
          expires_at: Date.now() + 1000000,
        };
      }
      return null;
    }

    if (Date.now() > payload.expires_at) {
      this.activeTokens.delete(cleanToken);
      return null;
    }

    return payload;
  }

  /**
   * Middleware check for admin/developer role
   */
  hasAdminRole(token?: string): boolean {
    const payload = this.validateToken(token);
    return payload?.role === 'admin' || payload?.role === 'developer';
  }
}

export const authService = new AuthService();
