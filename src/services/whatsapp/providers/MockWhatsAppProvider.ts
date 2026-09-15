import { IWhatsAppProvider, WhatsAppSendResult } from '../types';
import { metaMessagingService } from '../../mock';

export class MockWhatsAppProvider implements IWhatsAppProvider {
  name = 'Mock WhatsApp Provider (Development Simulator)';

  async sendTextMessage(to: string, body: string, footer?: string): Promise<WhatsAppSendResult> {
    const start = Date.now();
    const res = await metaMessagingService.sendMessage({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body },
    });
    return {
      success: true,
      messageId: res.message_id,
      recipientPhone: to,
      provider: 'mock',
      latencyMs: Date.now() - start,
    };
  }

  async sendInteractiveMessage(to: string, payload: any): Promise<WhatsAppSendResult> {
    const start = Date.now();
    const res = await metaMessagingService.sendMessage({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: payload,
    });
    return {
      success: true,
      messageId: res.message_id,
      recipientPhone: to,
      provider: 'mock',
      latencyMs: Date.now() - start,
    };
  }

  async sendTemplateMessage(to: string, templateName: string, languageCode: string = 'en_US'): Promise<WhatsAppSendResult> {
    const start = Date.now();
    const res = await metaMessagingService.sendMessage({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
      },
    });
    return {
      success: true,
      messageId: res.message_id,
      recipientPhone: to,
      provider: 'mock',
      latencyMs: Date.now() - start,
    };
  }

  async sendLocationRequest(to: string, bodyText: string): Promise<WhatsAppSendResult> {
    const start = Date.now();
    const res = await metaMessagingService.sendMessage({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'location',
    });
    return {
      success: true,
      messageId: res.message_id,
      recipientPhone: to,
      provider: 'mock',
      latencyMs: Date.now() - start,
    };
  }

  async markMessageRead(messageId: string): Promise<boolean> {
    return true;
  }
}

export const mockWhatsAppProvider = new MockWhatsAppProvider();
