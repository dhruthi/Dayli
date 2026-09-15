import { IWhatsAppProvider, WhatsAppSendResult } from '../types';

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

export class MetaWhatsAppProvider implements IWhatsAppProvider {
  name = 'Meta WhatsApp Business Cloud API (Graph API v19.0)';

  public getCredentials() {
    let accessToken = '';
    let phoneNumberId = '';

    if (typeof window !== 'undefined') {
      accessToken = (localStorage.getItem('meta_whatsapp_access_token') || '').trim();
      phoneNumberId = (localStorage.getItem('meta_whatsapp_phone_number_id') || '').trim();
    }

    if (!accessToken) {
      try {
        const viteToken = import.meta.env.VITE_META_WHATSAPP_ACCESS_TOKEN;
        if (viteToken && viteToken.trim()) accessToken = viteToken.trim();
      } catch (e) {}
    }

    if (!accessToken) {
      accessToken = (getEnvVar('VITE_META_WHATSAPP_ACCESS_TOKEN') || getEnvVar('META_WHATSAPP_ACCESS_TOKEN') || '').trim();
    }

    if (!phoneNumberId) {
      try {
        const vitePhoneId = import.meta.env.VITE_META_WHATSAPP_PHONE_NUMBER_ID;
        if (vitePhoneId && vitePhoneId.trim()) phoneNumberId = vitePhoneId.trim();
      } catch (e) {}
    }

    if (!phoneNumberId) {
      phoneNumberId = (getEnvVar('VITE_META_WHATSAPP_PHONE_NUMBER_ID') || getEnvVar('META_WHATSAPP_PHONE_NUMBER_ID') || '').trim();
    }

    return { accessToken, phoneNumberId };
  }

  private async executeMetaRequest(payload: any): Promise<WhatsAppSendResult> {
    const start = Date.now();
    const { accessToken, phoneNumberId } = this.getCredentials();

    if (!accessToken || !phoneNumberId) {
      return {
        success: false,
        messageId: '',
        recipientPhone: payload.to || '',
        provider: 'meta',
        latencyMs: Date.now() - start,
        error: 'Meta Cloud API Credentials (Access Token / Phone Number ID) missing.',
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const latencyMs = Date.now() - start;

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMessage = errJson?.error?.message || `HTTP ${res.status}`;
        return {
          success: false,
          messageId: '',
          recipientPhone: payload.to || '',
          provider: 'meta',
          latencyMs,
          error: `Meta Cloud API Error: ${errMessage}`,
        };
      }

      const data = await res.json();
      const messageId = data?.messages?.[0]?.id || `wamid.${Date.now()}`;

      return {
        success: true,
        messageId,
        recipientPhone: payload.to || '',
        provider: 'meta',
        latencyMs,
        rawResponse: data,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      return {
        success: false,
        messageId: '',
        recipientPhone: payload.to || '',
        provider: 'meta',
        latencyMs: Date.now() - start,
        error: err.name === 'AbortError' ? 'Meta Cloud API Request Timed Out' : err.message,
      };
    }
  }

  async sendTextMessage(to: string, body: string, footer?: string): Promise<WhatsAppSendResult> {
    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body },
    };
    return this.executeMetaRequest(payload);
  }

  async sendInteractiveMessage(to: string, interactivePayload: any): Promise<WhatsAppSendResult> {
    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: interactivePayload,
    };
    return this.executeMetaRequest(payload);
  }

  async sendTemplateMessage(to: string, templateName: string, languageCode: string = 'en_US'): Promise<WhatsAppSendResult> {
    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
      },
    };
    return this.executeMetaRequest(payload);
  }

  async sendLocationRequest(to: string, bodyText: string): Promise<WhatsAppSendResult> {
    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'location_request_message',
        body: { text: bodyText },
        action: { name: 'send_location' },
      },
    };
    return this.executeMetaRequest(payload);
  }

  async markMessageRead(messageId: string): Promise<boolean> {
    const { accessToken, phoneNumberId } = this.getCredentials();
    if (!accessToken || !phoneNumberId) return false;

    try {
      const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }
}

export const metaWhatsAppProvider = new MetaWhatsAppProvider();
