/**
 * Data Models matching official Meta WhatsApp Business Cloud API specification
 * https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
 */

export type MetaMessageType =
  | 'text'
  | 'template'
  | 'interactive'
  | 'image'
  | 'document'
  | 'audio'
  | 'location'
  | 'reaction'
  | 'form';

export interface MetaTextContent {
  preview_url?: boolean;
  body: string;
}

export interface MetaTemplateLanguage {
  code: string;
}

export interface MetaTemplateComponentParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document';
  text?: string;
  image?: { link: string };
  document?: { link: string; filename: string };
}

export interface MetaTemplateComponent {
  type: 'header' | 'body' | 'button' | 'footer';
  sub_type?: 'quick_reply' | 'url';
  index?: string;
  parameters?: MetaTemplateComponentParameter[];
}

export interface MetaTemplatePayload {
  name: string;
  language: MetaTemplateLanguage;
  components?: MetaTemplateComponent[];
}

export interface MetaButtonReply {
  id: string;
  title: string;
}

export interface MetaListRow {
  id: string;
  title: string;
  description?: string;
}

export interface MetaListSection {
  title: string;
  rows: MetaListRow[];
}

export interface MetaCarouselCard {
  card_index: number;
  components: Array<{
    type: 'HEADER' | 'BODY' | 'BUTTONS';
    format?: 'IMAGE' | 'VIDEO';
    example?: { header_handle?: string[] };
    text?: string;
    buttons?: Array<{
      type: 'QUICK_REPLY' | 'URL';
      text: string;
      url?: string;
    }>;
  }>;
}

export interface MetaInteractivePayload {
  type: 'button' | 'list' | 'product_list' | 'carousel';
  header?: {
    type: 'text' | 'image' | 'video' | 'document';
    text?: string;
    image?: { link: string };
  };
  body: {
    text: string;
  };
  footer?: {
    text: string;
  };
  action: {
    button?: string;
    buttons?: Array<{
      type: 'reply';
      reply: MetaButtonReply;
    }>;
    sections?: MetaListSection[];
    cards?: MetaCarouselCard[];
  };
}

export interface MetaMediaPayload {
  link: string;
  caption?: string;
  filename?: string;
  mime_type?: string;
}

export interface MetaLocationPayload {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface MetaOutboundPayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: MetaMessageType;
  text?: MetaTextContent;
  template?: MetaTemplatePayload;
  interactive?: MetaInteractivePayload;
  image?: MetaMediaPayload;
  document?: MetaMediaPayload;
  audio?: MetaMediaPayload;
  location?: MetaLocationPayload;
}

export type MetaMessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

export interface MetaWebhookValue {
  messaging_product: 'whatsapp';
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: Array<{
    profile: { name: string };
    wa_id: string;
  }>;
  messages?: Array<{
    from: string;
    id: string;
    timestamp: string;
    type: MetaMessageType;
    text?: { body: string };
    interactive?: {
      type: 'button_reply' | 'list_reply';
      button_reply?: { id: string; title: string };
      list_reply?: { id: string; title: string; description?: string };
    };
    location?: MetaLocationPayload;
  }>;
  statuses?: Array<{
    id: string;
    status: MetaMessageStatus;
    timestamp: string;
    recipient_id: string;
    errors?: Array<{ code: number; title: string }>;
  }>;
}

export interface MetaWebhookEvent {
  object: 'whatsapp_business_account';
  entry: Array<{
    id: string;
    changes: Array<{
      value: MetaWebhookValue;
      field: 'messages';
    }>;
  }>;
}
