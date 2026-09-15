import { NormalizedWhatsAppMessage } from './types';

export class WhatsAppMessageNormalizer {
  /**
   * Standardize raw Meta webhook payload into NormalizedWhatsAppMessage
   */
  normalizeMetaWebhook(payload: any): NormalizedWhatsAppMessage | null {
    try {
      const entry = payload?.entry?.[0];
      const change = entry?.changes?.[0]?.value;

      // 1. Status Update Event (sent / delivered / read)
      if (change?.statuses?.[0]) {
        const statusObj = change.statuses[0];
        return {
          message_id: `status_${statusObj.id}_${statusObj.status}`,
          user_id: statusObj.recipient_id || 'unknown',
          phone_number: statusObj.recipient_id || '',
          type: 'status_update',
          status_update: {
            meta_message_id: statusObj.id,
            status: statusObj.status as any,
            timestamp: new Date(Number(statusObj.timestamp || Date.now()) * 1000).toISOString(),
          },
          timestamp: new Date().toISOString(),
          raw_provider: 'meta',
          raw_payload: payload,
        };
      }

      // 2. Inbound Message Event
      const message = change?.messages?.[0];
      const contact = change?.contacts?.[0];

      if (!message) return null;

      const phoneNumber = message.from || contact?.wa_id || '';
      const userName = contact?.profile?.name || 'WhatsApp User';
      const messageId = message.id || `wamid_${Date.now()}`;
      const timeISO = message.timestamp
        ? new Date(Number(message.timestamp) * 1000).toISOString()
        : new Date().toISOString();

      // Text Message
      if (message.type === 'text') {
        return {
          message_id: messageId,
          user_id: phoneNumber,
          phone_number: phoneNumber,
          user_name: userName,
          type: 'text',
          text: message.text?.body || '',
          timestamp: timeISO,
          raw_provider: 'meta',
          raw_payload: payload,
        };
      }

      // Interactive Reply (Button or List Row Click)
      if (message.type === 'interactive') {
        const interactive = message.interactive;
        if (interactive?.type === 'button_reply') {
          return {
            message_id: messageId,
            user_id: phoneNumber,
            phone_number: phoneNumber,
            user_name: userName,
            type: 'interactive_reply',
            button_id: interactive.button_reply?.id,
            button_title: interactive.button_reply?.title,
            text: interactive.button_reply?.title,
            timestamp: timeISO,
            raw_provider: 'meta',
            raw_payload: payload,
          };
        }
        if (interactive?.type === 'list_reply') {
          return {
            message_id: messageId,
            user_id: phoneNumber,
            phone_number: phoneNumber,
            user_name: userName,
            type: 'interactive_reply',
            list_option_id: interactive.list_reply?.id,
            button_title: interactive.list_reply?.title,
            text: interactive.list_reply?.title,
            timestamp: timeISO,
            raw_provider: 'meta',
            raw_payload: payload,
          };
        }
      }

      // Location Shared
      if (message.type === 'location') {
        const loc = message.location;
        return {
          message_id: messageId,
          user_id: phoneNumber,
          phone_number: phoneNumber,
          user_name: userName,
          type: 'location',
          location: {
            latitude: loc?.latitude || 28.6139,
            longitude: loc?.longitude || 77.209,
            name: loc?.name || 'Shared Location',
            address: loc?.address,
          },
          timestamp: timeISO,
          raw_provider: 'meta',
          raw_payload: payload,
        };
      }

      // Fallback
      return {
        message_id: messageId,
        user_id: phoneNumber,
        phone_number: phoneNumber,
        user_name: userName,
        type: 'text',
        text: message.text?.body || 'Message received',
        timestamp: timeISO,
        raw_provider: 'meta',
        raw_payload: payload,
      };
    } catch (err) {
      console.error('Error normalizing Meta Webhook payload:', err);
      return null;
    }
  }

  /**
   * Standardize simulated user event into NormalizedWhatsAppMessage
   */
  normalizeSimulatorEvent(params: {
    phoneNumber: string;
    userName: string;
    type: 'text' | 'button_click' | 'list_select' | 'send_location';
    text?: string;
    buttonId?: string;
    buttonTitle?: string;
    optionId?: string;
    location?: { latitude: number; longitude: number; name?: string };
  }): NormalizedWhatsAppMessage {
    const msgId = `sim_msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const timeISO = new Date().toISOString();

    if (params.type === 'button_click') {
      return {
        message_id: msgId,
        user_id: params.phoneNumber,
        phone_number: params.phoneNumber,
        user_name: params.userName,
        type: 'interactive_reply',
        button_id: params.buttonId,
        button_title: params.buttonTitle || 'Button Clicked',
        text: params.buttonTitle || 'Button Clicked',
        timestamp: timeISO,
        raw_provider: 'mock',
      };
    }

    if (params.type === 'list_select') {
      return {
        message_id: msgId,
        user_id: params.phoneNumber,
        phone_number: params.phoneNumber,
        user_name: params.userName,
        type: 'interactive_reply',
        list_option_id: params.optionId,
        button_title: params.text || 'Option Selected',
        text: params.text || 'Option Selected',
        timestamp: timeISO,
        raw_provider: 'mock',
      };
    }

    if (params.type === 'send_location' && params.location) {
      return {
        message_id: msgId,
        user_id: params.phoneNumber,
        phone_number: params.phoneNumber,
        user_name: params.userName,
        type: 'location',
        location: {
          latitude: params.location.latitude,
          longitude: params.location.longitude,
          name: params.location.name || 'Shared GPS',
        },
        timestamp: timeISO,
        raw_provider: 'mock',
      };
    }

    return {
      message_id: msgId,
      user_id: params.phoneNumber,
      phone_number: params.phoneNumber,
      user_name: params.userName,
      type: 'text',
      text: params.text || '',
      timestamp: timeISO,
      raw_provider: 'mock',
    };
  }
}

export const whatsAppMessageNormalizer = new WhatsAppMessageNormalizer();
