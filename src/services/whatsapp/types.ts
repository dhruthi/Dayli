export interface WhatsAppSendResult {
  success: boolean;
  messageId: string;
  recipientPhone: string;
  provider: 'meta' | 'mock';
  latencyMs: number;
  rawResponse?: any;
  error?: string;
}

export interface NormalizedWhatsAppMessage {
  message_id: string;
  user_id: string;
  phone_number: string;
  user_name?: string;
  type: 'text' | 'interactive_reply' | 'location' | 'status_update' | 'unknown';
  text?: string;
  button_id?: string;
  button_title?: string;
  list_option_id?: string;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  status_update?: {
    meta_message_id: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    timestamp: string;
  };
  timestamp: string;
  raw_provider: 'meta' | 'mock';
  raw_payload?: any;
}

export interface IWhatsAppProvider {
  name: string;
  sendTextMessage(to: string, body: string, footer?: string): Promise<WhatsAppSendResult>;
  sendInteractiveMessage(to: string, payload: any): Promise<WhatsAppSendResult>;
  sendTemplateMessage(to: string, templateName: string, languageCode?: string): Promise<WhatsAppSendResult>;
  sendLocationRequest(to: string, bodyText: string): Promise<WhatsAppSendResult>;
  markMessageRead(messageId: string): Promise<boolean>;
}

export interface WebhookVerificationParams {
  mode?: string;
  verifyToken?: string;
  challenge?: string;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  challenge?: string;
  message: string;
}

export interface WhatsAppProviderStatus {
  providerType: 'mock' | 'meta';
  isConfigured: boolean;
  hasAccessToken: boolean;
  hasPhoneNumberId: boolean;
  hasVerifyToken: boolean;
  hasAppSecret: boolean;
  maskedToken?: string;
  maskedPhoneNumberId?: string;
  lastRequestLatencyMs?: number;
  lastWebhookTimestamp?: string;
}
