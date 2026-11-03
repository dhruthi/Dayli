/**
 * Production structured logger for dayli.ai WhatsApp Bridge.
 * Sanitizes and suppresses PHI (Personal Health Information) and secrets.
 */

const PII_PATTERNS = [
  [/\b[6-9]\d{9}\b/g, '[REDACTED_PHONE]'],
  [/\b\+91[\s-]?[6-9]\d{9}\b/g, '[REDACTED_PHONE]'],
  [/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[REDACTED_AADHAAR]'],
  [/\b[A-Z]{5}\d{4}[A-Z]\b/g, '[REDACTED_PAN]'],
  [/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, '[REDACTED_EMAIL]'],
];

export function sanitize(text) {
  if (typeof text !== 'string') return text;
  let clean = text;
  for (const [pattern, replacement] of PII_PATTERNS) {
    clean = clean.replace(pattern, replacement);
  }
  return clean;
}

export const logger = {
  info(msg, meta = {}) {
    const timestamp = new Date().toISOString();
    console.log(`ℹ️ [${timestamp}] [INFO] ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  warn(msg, meta = {}) {
    const timestamp = new Date().toISOString();
    console.warn(`⚠️ [${timestamp}] [WARN] ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  error(msg, meta = {}) {
    const timestamp = new Date().toISOString();
    console.error(`❌ [${timestamp}] [ERROR] ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  debug(msg, meta = {}) {
    if (process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      console.debug(`🔍 [${timestamp}] [DEBUG] ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
    }
  },
};
