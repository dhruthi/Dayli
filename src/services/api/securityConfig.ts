export const ALLOWED_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'https://dayli.ai',
  'https://app.dayli.ai',
];

export class SecurityConfig {
  /**
   * Validate if incoming request origin is allowed under CORS
   */
  isOriginAllowed(origin?: string): boolean {
    if (!origin) return true; // Local non-browser or same-origin requests
    if (ALLOWED_CORS_ORIGINS.includes(origin)) return true;
    if (origin.endsWith('.surge.sh') || origin.endsWith('.dayli.ai')) return true;
    return false;
  }

  /**
   * Sanitize text input to prevent XSS / script injection
   */
  sanitizeInput(text: string): string {
    if (!text) return '';
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .trim();
  }
}

export const securityConfig = new SecurityConfig();
