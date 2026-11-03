import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createSessionToken,
  verifySessionToken,
  validateCredentials,
  requireDashboardAuth,
  checkPasswordStrength,
  checkLoginRateLimit,
  recordLoginAttempt,
  resetRateLimits,
  getLoginPageHtml,
  handleLogin,
  LOGIN_PAGE_HTML,
} from '../lib/auth.js';

describe('Clinical Dashboard Login & Auth Gate (lib/auth.js)', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it('creates and verifies signed HMAC-SHA256 session tokens', () => {
    const token = createSessionToken('clinical@dayli.ai');
    expect(token).toContain('.');
    const verified = verifySessionToken(token);
    expect(verified.valid).toBe(true);
    expect(verified.user).toBe('clinical@dayli.ai');
  });

  it('rejects tampered or malformed session tokens', () => {
    const token = createSessionToken('clinical@dayli.ai');
    const tampered = token.slice(0, -3) + 'xyz';
    expect(verifySessionToken(tampered).valid).toBe(false);
    expect(verifySessionToken('invalid').valid).toBe(false);
  });

  it('validates default and environment clinical credentials', () => {
    expect(validateCredentials('clinical@dayli.ai', 'DayliAurora2026!')).toBe(true);
    expect(validateCredentials('clinical@dayli.ai', 'wrongpass')).toBe(false);
  });

  it('redirects unauthenticated browser requests to /login and allows valid session cookies', () => {
    const reqUnauth = {
      path: '/dashboard',
      originalUrl: '/dashboard',
      headers: {},
    };
    const resUnauth = {
      redirect: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const nextUnauth = vi.fn();

    requireDashboardAuth(reqUnauth, resUnauth, nextUnauth);
    expect(resUnauth.redirect).toHaveBeenCalledWith(302, '/login?next=%2Fdashboard');
    expect(nextUnauth).not.toHaveBeenCalled();

    const validToken = createSessionToken('clinical@dayli.ai');
    const reqAuth = {
      path: '/dashboard',
      originalUrl: '/dashboard',
      headers: {
        cookie: `dayli_session=${encodeURIComponent(validToken)}`,
      },
    };
    const nextAuth = vi.fn();
    requireDashboardAuth(reqAuth, resUnauth, nextAuth);
    expect(nextAuth).toHaveBeenCalled();
  });

  it('renders Dayli.ai Sunrise themed login HTML', () => {
    expect(LOGIN_PAGE_HTML).toContain('clinical@dayli.ai');
    expect(LOGIN_PAGE_HTML).toContain('Zero-PHI De-Identified Clinical Access');
  });

  it('enforces strong password complexity and rejects weak/trivial passwords', () => {
    expect(checkPasswordStrength('123456').strong).toBe(false);
    expect(checkPasswordStrength('password').strong).toBe(false);
    expect(checkPasswordStrength('short1!A').strong).toBe(false); // < 10 chars
    expect(checkPasswordStrength('alllowercase123!').strong).toBe(false); // No uppercase
    expect(checkPasswordStrength('ALLUPPERCASE123!').strong).toBe(false); // No lowercase
    expect(checkPasswordStrength('NoSpecialChar12345').strong).toBe(false); // No symbol
    expect(checkPasswordStrength('Admin12345678!').strong).toBe(false); // Insecure pattern

    const valid = checkPasswordStrength('K8#mP$9vL2!wQ7z');
    expect(valid.strong).toBe(true);
  });

  it('rate limits failed login attempts and blocks brute-force attacks after 5 failures', () => {
    const testIp = '198.51.100.42';
    for (let i = 0; i < 4; i++) {
      recordLoginAttempt(testIp, false);
      expect(checkLoginRateLimit(testIp).allowed).toBe(true);
    }

    // 5th failed attempt locks out the IP
    recordLoginAttempt(testIp, false);
    const locked = checkLoginRateLimit(testIp);
    expect(locked.allowed).toBe(false);
    expect(locked.error).toContain('Too many failed login attempts');
    expect(locked.retryAfterSec).toBeGreaterThan(0);
  });

  it('strips credentials helper card in production mode', () => {
    const prodHtml = getLoginPageHtml({ isProduction: true });
    expect(prodHtml).not.toContain('<div class="cred-card">');
    expect(prodHtml).not.toContain('fillDemo');
    expect(prodHtml).not.toContain('Authorized Evaluator Credentials');
    expect(prodHtml).toContain('Zero-PHI De-Identified Clinical Access');
  });
});
