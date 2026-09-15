import { WebhookVerificationParams, WebhookVerificationResult } from './types';

function getEnvVar(key: string): string | undefined {
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv[key]) return metaEnv[key];
  } catch (e) {}
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {}
  return undefined;
}

export class WebhookHandler {
  /**
   * Verify GET Webhook Handshake from Meta
   */
  verifyWebhook(params: WebhookVerificationParams): WebhookVerificationResult {
    const expectedToken = (
      getEnvVar('VITE_META_WHATSAPP_VERIFY_TOKEN') ||
      getEnvVar('META_WHATSAPP_VERIFY_TOKEN') ||
      'dayli_ai_webhook_verify_token_2026'
    ).trim();

    const { mode, verifyToken, challenge } = params;

    if (mode === 'subscribe' && verifyToken === expectedToken) {
      return {
        isValid: true,
        challenge: challenge || 'OK',
        message: 'Webhook handshake verified successfully.',
      };
    }

    return {
      isValid: false,
      message: `Webhook verification failed. Provided verify_token (${verifyToken || 'none'}) does not match expected.`,
    };
  }

  /**
   * Validate HMAC SHA-256 Signature for POST Webhook events
   */
  async validateSignature(rawPayloadBody: string, signatureHeader?: string): Promise<boolean> {
    const appSecret = (getEnvVar('VITE_META_WHATSAPP_APP_SECRET') || getEnvVar('META_WHATSAPP_APP_SECRET') || '').trim();

    // If app secret is not configured, pass validation in development/mock mode
    if (!appSecret) return true;
    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;

    try {
      const signature = signatureHeader.replace('sha256=', '');
      const encoder = new TextEncoder();
      const keyData = encoder.encode(appSecret);
      const msgData = encoder.encode(rawPayloadBody);

      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
      const hashArray = Array.from(new Uint8Array(signatureBuffer));
      const expectedHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      return signature === expectedHash;
    } catch (err) {
      console.error('Webhook HMAC signature validation error:', err);
      return false;
    }
  }
}

export const webhookHandler = new WebhookHandler();
