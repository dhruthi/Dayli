import { IMetaMessagingService } from '../interfaces';
import { MetaOutboundPayload, MetaWebhookEvent } from '../../types/metaApi';

type WebhookListener = (event: MetaWebhookEvent) => void;

export class MockMetaMessagingService implements IMetaMessagingService {
  private listeners: WebhookListener[] = [];
  private sentLogs: Array<{ timestamp: string; payload: MetaOutboundPayload; messageId: string }> = [];

  subscribeWebhooks(listener: WebhookListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  async sendMessage(payload: MetaOutboundPayload): Promise<{ message_id: string; status: 'accepted' }> {
    const messageId = `wmid.HBgL${Math.random().toString(36).substring(2, 15).toUpperCase()}==`;

    this.sentLogs.push({
      timestamp: new Date().toISOString(),
      payload,
      messageId,
    });

    // Fire simulated Webhook status event: SENT -> DELIVERED -> READ
    setTimeout(() => {
      this.emitStatusWebhook(messageId, payload.to, 'sent');
    }, 150);

    setTimeout(() => {
      this.emitStatusWebhook(messageId, payload.to, 'delivered');
    }, 600);

    setTimeout(() => {
      this.emitStatusWebhook(messageId, payload.to, 'read');
    }, 1100);

    return { message_id: messageId, status: 'accepted' };
  }

  simulateWebhook(event: MetaWebhookEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  simulateUserInboundMessage(fromPhone: string, userName: string, textOrInteractive: { type: string; body?: string; buttonId?: string; buttonTitle?: string }) {
    const messageId = `wmid.HBgL${Math.random().toString(36).substring(2, 15).toUpperCase()}==`;
    const nowSec = Math.floor(Date.now() / 1000).toString();

    const event: MetaWebhookEvent = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '10984839201948',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '+1 555 019 2831',
                  phone_number_id: '102938475610293',
                },
                contacts: [
                  {
                    profile: { name: userName },
                    wa_id: fromPhone,
                  },
                ],
                messages: [
                  {
                    from: fromPhone,
                    id: messageId,
                    timestamp: nowSec,
                    type: textOrInteractive.buttonId ? 'interactive' : 'text',
                    text: textOrInteractive.body ? { body: textOrInteractive.body } : undefined,
                    interactive: textOrInteractive.buttonId
                      ? {
                          type: 'button_reply',
                          button_reply: {
                            id: textOrInteractive.buttonId,
                            title: textOrInteractive.buttonTitle || textOrInteractive.buttonId,
                          },
                        }
                      : undefined,
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    this.simulateWebhook(event);
  }

  private emitStatusWebhook(messageId: string, recipientId: string, status: 'sent' | 'delivered' | 'read') {
    const nowSec = Math.floor(Date.now() / 1000).toString();
    const event: MetaWebhookEvent = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '10984839201948',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '+1 555 019 2831',
                  phone_number_id: '102938475610293',
                },
                statuses: [
                  {
                    id: messageId,
                    status,
                    timestamp: nowSec,
                    recipient_id: recipientId,
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    this.simulateWebhook(event);
  }

  getSentLogs() {
    return this.sentLogs;
  }
}

export const metaMessagingService = new MockMetaMessagingService();
