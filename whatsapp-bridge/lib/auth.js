/**
 * ==============================================================================
 * Dayli AI — Clinical & Executive Portal Authentication
 * ==============================================================================
 * Protects /dashboard, /pitch, and telemetry endpoints with signed HMAC-SHA256
 * session cookies and credential verification.
 */

import crypto from 'node:crypto';

const DEFAULT_USERNAME = 'clinical@dayli.ai';
const DEFAULT_PASSWORD = 'DayliAurora2026!';
const COOKIE_NAME = 'dayli_session';
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

// Brute-force & credential-stuffing defense: failed attempts map (IP -> entry)
const failedAttempts = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15-minute temporary lockout

/**
 * Checks password complexity to prevent weak passwords on live deployments.
 * Requires: >= 10 chars, uppercase, lowercase, digit, special char, no common weak passwords.
 * @param {string} password
 * @returns {{ strong: boolean, reason?: string }}
 */
export function checkPasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { strong: false, reason: 'Password cannot be empty.' };
  }
  if (password.length < 10) {
    return { strong: false, reason: 'Password must be at least 10 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { strong: false, reason: 'Password must contain at least one uppercase letter (A-Z).' };
  }
  if (!/[a-z]/.test(password)) {
    return { strong: false, reason: 'Password must contain at least one lowercase letter (a-z).' };
  }
  if (!/[0-9]/.test(password)) {
    return { strong: false, reason: 'Password must contain at least one number (0-9).' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { strong: false, reason: 'Password must contain at least one special symbol.' };
  }
  const commonWeak = ['password', '123456', 'admin123', 'dayli123', 'qwerty', 'welcome'];
  if (commonWeak.some((weak) => password.toLowerCase().includes(weak))) {
    return { strong: false, reason: 'Password contains a common insecure pattern.' };
  }
  return { strong: true };
}

/**
 * Extracts client IP considering reverse proxies (Cloudflare, Render, Caddy).
 * @param {object} req
 * @returns {string}
 */
export function getClientIp(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Checks if client IP is currently rate-limited due to repeated failed logins.
 * @param {string} ip
 * @returns {{ allowed: boolean, error?: string, retryAfterSec?: number }}
 */
export function checkLoginRateLimit(ip) {
  const now = Date.now();
  const record = failedAttempts.get(ip);
  if (!record) return { allowed: true };

  if (record.lockedUntil && now < record.lockedUntil) {
    const remainingSec = Math.ceil((record.lockedUntil - now) / 1000);
    const remainingMin = Math.ceil(remainingSec / 60);
    return {
      allowed: false,
      error: `Too many failed login attempts. Access locked for ${remainingMin} minute(s) to protect surveillance telemetry.`,
      retryAfterSec: remainingSec,
    };
  }

  if (now - record.firstAttemptAt > LOCKOUT_MS) {
    failedAttempts.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

/**
 * Records a login outcome for IP-based rate limiting.
 * @param {string} ip
 * @param {boolean} success
 */
export function recordLoginAttempt(ip, success) {
  const now = Date.now();
  if (success) {
    failedAttempts.delete(ip);
    return;
  }
  let record = failedAttempts.get(ip);
  if (!record || now - record.firstAttemptAt > LOCKOUT_MS) {
    record = { count: 1, firstAttemptAt: now, lockedUntil: 0 };
  } else {
    record.count += 1;
  }
  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
  }
  failedAttempts.set(ip, record);
}

export function resetRateLimits() {
  failedAttempts.clear();
}

function getSecret() {
  return (
    process.env.DASHBOARD_SECRET ||
    process.env.DAYLI_INTERNAL_API_KEY ||
    'dayli-zero-phi-clinical-portal-secret-2026'
  );
}

export function getExpectedCredentials() {
  return {
    username: (process.env.DASHBOARD_USERNAME || DEFAULT_USERNAME).trim(),
    password: (process.env.DASHBOARD_PASSWORD || DEFAULT_PASSWORD).trim(),
  };
}

/**
 * Generates an HMAC-signed session token for an authenticated user.
 * @param {string} username
 * @returns {string}
 */
export function createSessionToken(username) {
  const payload = JSON.stringify({
    sub: username,
    iat: Date.now(),
    exp: Date.now() + SESSION_MAX_AGE_SEC * 1000,
  });
  const encoded = Buffer.from(payload, 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

/**
 * Verifies an HMAC-signed session token.
 * @param {string} token
 * @returns {{ valid: boolean, user?: string }}
 */
export function verifySessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return { valid: false };
  }
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return { valid: false };

  const expectedSig = crypto.createHmac('sha256', getSecret()).update(encoded).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false };
  }

  try {
    const data = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!data.exp || Date.now() > data.exp) {
      return { valid: false };
    }
    return { valid: true, user: data.sub };
  } catch {
    return { valid: false };
  }
}

/**
 * Parses cookies from a raw Cookie header string.
 * @param {string} cookieHeader
 * @returns {Record<string, string>}
 */
export function parseCookies(cookieHeader = '') {
  const out = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') return out;
  for (const pair of cookieHeader.split(';')) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

/**
 * Validates username & password against configured credentials.
 * @param {string} username
 * @param {string} password
 * @returns {boolean}
 */
export function validateCredentials(username, password) {
  const expected = getExpectedCredentials();
  const u = String(username || '').trim().toLowerCase();
  const p = String(password || '').trim();

  const validUser =
    u === expected.username.toLowerCase() ||
    u === 'admin@dayli.ai' ||
    u === 'clinical@dayli.ai' ||
    u === 'dayli';

  const a = Buffer.from(p);
  const b = Buffer.from(expected.password);
  const validPass = a.length === b.length && crypto.timingSafeEqual(a, b);

  return validUser && validPass;
}

/**
 * Express middleware to guard dashboard & API routes.
 */
export function requireDashboardAuth(req, res, next) {
  // 1. Check signed session cookie
  const cookies = parseCookies(req.headers?.cookie || '');
  const token = cookies[COOKIE_NAME];
  if (token) {
    const verified = verifySessionToken(token);
    if (verified.valid) {
      req.dashboardUser = verified.user;
      return next();
    }
  }

  // 2. Check Authorization header (Bearer token or Basic auth)
  const authHeader = req.headers?.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    const verified = verifySessionToken(bearer);
    const internalKey = (process.env.DAYLI_INTERNAL_API_KEY || '').trim();
    if (verified.valid || (internalKey && bearer === internalKey)) {
      return next();
    }
  } else if (authHeader.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
      const sep = decoded.indexOf(':');
      const u = decoded.slice(0, sep);
      const p = decoded.slice(sep + 1);
      if (validateCredentials(u, p)) {
        return next();
      }
    } catch {
      // fall through
    }
  }

  // If API request, return 401 JSON
  if (req.path?.startsWith('/api/')) {
    return res.status(401).json({ error: 'unauthorized', loginUrl: '/login' });
  }

  // Otherwise redirect browser to /login
  const nextUrl = encodeURIComponent(req.originalUrl || '/dashboard');
  return res.redirect(302, `/login?next=${nextUrl}`);
}

/**
 * POST /api/auth/login handler with brute-force rate limiting & secure cookie assignment.
 */
export function handleLogin(req, res) {
  const ip = getClientIp(req);

  // 1. IP-based rate limiting check (max 5 failed attempts per 15 minutes)
  const rateLimit = checkLoginRateLimit(ip);
  if (!rateLimit.allowed) {
    if (rateLimit.retryAfterSec) {
      res.set('Retry-After', String(rateLimit.retryAfterSec));
    }
    return res.status(429).json({
      ok: false,
      error: rateLimit.error,
    });
  }

  const { username, email, password, next } = req.body || {};
  const loginId = username || email;

  // 2. Validate credentials against environment-configured passkey
  if (!validateCredentials(loginId, password)) {
    recordLoginAttempt(ip, false);
    return res.status(401).json({
      ok: false,
      error: 'Invalid clinical portal credentials. Please verify your email and access key.',
    });
  }

  // Reset rate limiting counter on successful authentication
  recordLoginAttempt(ip, true);

  // 3. Issue HMAC-SHA256 session token with secure cookie headers
  const isSecure = req.secure || req.headers?.['x-forwarded-proto'] === 'https';
  const secureFlag = isSecure ? '; Secure' : '';
  const token = createSessionToken(String(loginId).trim());
  res.set(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax${secureFlag}; Max-Age=${SESSION_MAX_AGE_SEC}`
  );

  return res.status(200).json({
    ok: true,
    user: String(loginId).trim(),
    redirectTo: next && String(next).startsWith('/') ? String(next) : '/dashboard',
  });
}

/**
 * POST /api/auth/logout handler
 */
export function handleLogout(req, res) {
  const isSecure = req?.secure || req?.headers?.['x-forwarded-proto'] === 'https';
  const secureFlag = isSecure ? '; Secure' : '';
  res.set('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax${secureFlag}; Max-Age=0`);
  return res.redirect(302, '/login');
}

/**
 * Returns the HTML for the login page, dynamically hiding demo credentials
 * in production or whenever customized credentials are in effect.
 * @param {{ isProduction?: boolean }} [options]
 * @returns {string}
 */
export function getLoginPageHtml(options = {}) {
  const isProduction =
    options.isProduction ??
    (process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER));
  const showDemo =
    process.env.ENABLE_DEMO_LOGIN_HELPER === 'true' ||
    (!isProduction && !process.env.DASHBOARD_PASSWORD && process.env.HIDE_DEMO_CREDENTIALS !== 'true');

  if (showDemo) {
    return LOGIN_PAGE_HTML;
  }

  // In production, strip out the demo credentials card and auto-fill script
  return LOGIN_PAGE_HTML
    .replace(/\s*<div class="cred-card">[\s\S]*?<\/div>\s*<\/div>/, '\n  </div>')
    .replace(/function fillDemo\(\) \{[\s\S]*?\}/, '');
}

export const LOGIN_PAGE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0E5C5A">
<meta name="robots" content="noindex, nofollow">
<title>dayli.ai — Clinical & Maternal Intelligence Sign In</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,400..800,0..100;1,9..144,400..700,0..100&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  :root {
    --background: #FCF9F5;
    --foreground: #092227;
    --text-secondary: #35555B;
    --text-muted: #5F7D83;
    --card: #FFFFFF;
    --border: #D6DFE1;
    --primary: #0E5C5A;
    --primary-light: #E6F3F2;
    --coral: #F26C4F;
    --coral-ink: #962A14;
    --marigold: #FCA82B;
    --marigold-ink: #87480E;
    --emerald: #0D9488;
    --font-sans: 'Plus Jakarta Sans', system-ui, sans-serif;
    --font-serif: 'Fraunces', Georgia, serif;
    --font-mono: 'Space Mono', monospace;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    font-family: var(--font-sans);
    color: var(--foreground);
    background-color: var(--background);
    background-image:
      radial-gradient(80% 60% at 85% 0%, rgba(252, 168, 43, 0.22) 0%, transparent 60%),
      radial-gradient(70% 50% at 0% 100%, rgba(242, 108, 79, 0.14) 0%, transparent 65%),
      linear-gradient(180deg, #FCF7EE, #FAF7F2 70%);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 24px;
  }
  .login-shell {
    width: 100%;
    max-width: 440px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 24px;
    padding: 36px 34px;
    box-shadow: 0 20px 50px -10px rgba(9, 34, 39, 0.09), 0 4px 14px -2px rgba(9, 34, 39, 0.04);
  }
  .brand-row {
    display: flex;
    align-items: baseline;
    justify-content: center;
    margin-bottom: 8px;
  }
  .brand-dayli {
    font-family: var(--font-serif);
    font-size: 34px;
    font-weight: 700;
    letter-spacing: -0.6px;
    background: linear-gradient(95deg, var(--coral-ink), var(--marigold-ink) 45%, var(--primary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .brand-dot {
    background: var(--marigold);
    width: 8px;
    height: 8px;
    box-shadow: 0 0 0 4px rgba(252, 168, 43, 0.25);
    border-radius: 9999px;
    margin: 0 4px;
    display: inline-block;
    transform: translateY(-6px);
  }
  .brand-ai {
    font-family: var(--font-serif);
    font-size: 34px;
    font-weight: 700;
    letter-spacing: -0.6px;
    color: rgba(9, 34, 39, 0.45);
  }
  .subtitle {
    text-align: center;
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 24px;
  }
  .zero-phi-pill {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: var(--primary-light);
    color: var(--primary);
    border: 1px solid rgba(14, 92, 90, 0.2);
    border-radius: 9999px;
    padding: 6px 14px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    margin: 0 auto 24px;
    width: fit-content;
  }
  .form-group {
    margin-bottom: 16px;
  }
  label {
    display: block;
    font-size: 12px;
    font-weight: 700;
    color: var(--foreground);
    margin-bottom: 6px;
  }
  input {
    width: 100%;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: #FCF9F5;
    color: var(--foreground);
    font-family: var(--font-sans);
    font-size: 14px;
    transition: all 0.15s ease;
  }
  input:focus {
    outline: none;
    border-color: var(--primary);
    background: #FFFFFF;
    box-shadow: 0 0 0 3px rgba(14, 92, 90, 0.14);
  }
  .btn-submit {
    width: 100%;
    padding: 13px 20px;
    border-radius: 9999px;
    border: none;
    background: var(--primary);
    color: #FFFFFF;
    font-family: var(--font-sans);
    font-size: 14.5px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 6px 18px rgba(14, 92, 90, 0.25);
    transition: all 0.18s ease;
    margin-top: 6px;
  }
  .btn-submit:hover {
    background: #0b4947;
    transform: translateY(-1px);
  }
  .error-box {
    display: none;
    background: #FFE4E6;
    color: #9F1239;
    border: 1px solid rgba(225, 29, 72, 0.3);
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 12.5px;
    margin-bottom: 16px;
  }
  .cred-card {
    margin-top: 22px;
    padding: 14px 16px;
    background: #FAF7F2;
    border: 1px dashed var(--border);
    border-radius: 14px;
    font-size: 12px;
    color: var(--text-secondary);
  }
  .cred-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-weight: 700;
    color: var(--foreground);
  }
  .btn-autofill {
    background: var(--primary-light);
    color: var(--primary);
    border: 1px solid rgba(14, 92, 90, 0.25);
    border-radius: 9999px;
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  }
  .btn-autofill:hover {
    background: #d3ebe9;
  }
  .mono {
    font-family: var(--font-mono);
    font-size: 11.5px;
    color: var(--primary);
    font-weight: 700;
  }
</style>
</head>
<body>
  <div class="login-shell">
    <div class="brand-row">
      <span class="brand-dayli">dayli</span><span class="brand-dot"></span><span class="brand-ai">ai</span>
    </div>
    <div class="subtitle">Climate & Maternal Health Surveillance Command</div>
    <div class="zero-phi-pill">🔒 Zero-PHI De-Identified Clinical Access</div>

    <div id="error-box" class="error-box"></div>

    <form id="login-form" onsubmit="submitLogin(event)">
      <div class="form-group">
        <label for="username">Clinical Officer / Partner ID</label>
        <input id="username" name="username" type="text" placeholder="clinical@dayli.ai" required autocomplete="username">
      </div>
      <div class="form-group">
        <label for="password">Access Passkey</label>
        <input id="password" name="password" type="password" placeholder="••••••••••••" required autocomplete="current-password">
      </div>
      <button type="submit" class="btn-submit" id="btn-submit">Sign In to Surveillance Portal →</button>
    </form>

    <div class="cred-card">
      <div class="cred-card-header">
        <span>🔑 Authorized Evaluator Credentials</span>
        <button type="button" class="btn-autofill" onclick="fillDemo()">Auto-Fill</button>
      </div>
      <div>User ID: <span class="mono">clinical@dayli.ai</span></div>
      <div>Passkey: <span class="mono">DayliAurora2026!</span></div>
    </div>
  </div>

  <script>
    function fillDemo() {
      document.getElementById('username').value = 'clinical@dayli.ai';
      document.getElementById('password').value = 'DayliAurora2026!';
    }
    async function submitLogin(e) {
      e.preventDefault();
      const errBox = document.getElementById('error-box');
      const btn = document.getElementById('btn-submit');
      errBox.style.display = 'none';
      btn.disabled = true;
      btn.textContent = 'Verifying clinical credentials...';

      const params = new URLSearchParams(window.location.search);
      const next = params.get('next') || '/dashboard';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: document.getElementById('username').value,
            password: document.getElementById('password').value,
            next
          })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'Authentication failed');
        }
        window.location.href = data.redirectTo || '/dashboard';
      } catch (err) {
        errBox.textContent = err.message;
        errBox.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Sign In to Surveillance Portal →';
      }
    }
  </script>
</body>
</html>`;
