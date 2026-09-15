import { MetaOutboundPayload, MetaMessageStatus, MetaMessageType } from './metaApi';
import { AIOrchestrationMetadata } from './services';

export type FlowNodeType =
  | 'text'
  | 'template'
  | 'interactive_buttons'
  | 'interactive_list'
  | 'carousel'
  | 'location_request'
  | 'media'
  | 'audio'
  | 'form'
  | 'api_call'
  | 'condition_branch'
  | 'end';

export interface FlowButton {
  id: string;
  title: string;
  next: string;
  variablesToSet?: Record<string, any>;
}

export interface FlowListOption {
  id: string;
  title: string;
  description?: string;
  next: string;
  variablesToSet?: Record<string, any>;
}

export interface FlowListSection {
  title: string;
  options: FlowListOption[];
}

export interface FlowCarouselCard {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  badge?: string;
  buttonText: string;
  next: string;
  variablesToSet?: Record<string, any>;
}

export interface FlowFormField {
  id: string;
  label: string;
  type: 'select' | 'radio' | 'checkbox' | 'text' | 'number';
  options?: string[];
  required?: boolean;
}

export interface FlowCondition {
  variable: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'truthy';
  value: any;
  nextIfTrue: string;
  nextIfFalse: string;
}

export interface FlowApiCall {
  service: 'weather' | 'patient' | 'referral' | 'notification' | 'analytics' | 'openai';
  method: string;
  params?: Record<string, any>;
  storeResultAs?: string;
  next: string;
}

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  message?: string;
  header?: string;
  footer?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'document' | 'audio';
  fileName?: string;
  durationSeconds?: number;
  templateName?: string;
  buttons?: FlowButton[];
  quickReplies?: FlowButton[];
  listSections?: FlowListSection[];
  carouselCards?: FlowCarouselCard[];
  formFields?: FlowFormField[];
  condition?: FlowCondition;
  apiCall?: FlowApiCall;
  next?: string;
  typingDelay?: number; // milliseconds
  variablesToSet?: Record<string, any>;
  presentationAutoResponse?: {
    action: 'click_button' | 'select_list' | 'send_location' | 'submit_form' | 'type_text';
    value: string; // button id or option id or text
    formData?: Record<string, any>;
    delayMs?: number;
  };
}

export interface FlowDefinition {
  id: string;
  title: string;
  description: string;
  category: string;
  badge: string;
  estimatedDuration: string;
  targetAudience: string;
  initialNodeId: string;
  nodes: Record<string, FlowNode>;
}

export interface UserProfile {
  name: string;
  phoneNumber: string;
  language: string;
  trimester?: string;
  isPregnant?: boolean;
  childAge?: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'system';
  type: MetaMessageType;
  content: string;
  header?: string;
  footer?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'document' | 'audio';
  fileName?: string;
  durationSeconds?: number;
  buttons?: FlowButton[];
  listSections?: FlowListSection[];
  carouselCards?: FlowCarouselCard[];
  formFields?: FlowFormField[];
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  timestamp: string;
  status: MetaMessageStatus;
  rawPayload?: MetaOutboundPayload; // Exact Meta Cloud API JSON representation
  metaMessageId?: string;
  metadata?: AIOrchestrationMetadata;
}

export interface SessionState {
  workflowId: string | null;
  currentNodeId: string | null;
  status: 'idle' | 'running' | 'waiting_user_input' | 'completed' | 'paused';
  userProfile: UserProfile;
  variables: Record<string, any>;
  messages: ChatMessage[];
  stepHistory: string[];
}
