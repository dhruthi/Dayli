import { create } from 'zustand';
import { MetaOutboundPayload, MetaWebhookEvent } from '../types/metaApi';
import { FlowNode } from '../types/chatEngine';

export type ConsoleTab = 'api_logs' | 'webhooks' | 'variables' | 'flow_tracker' | 'templates' | 'analytics' | 'openai' | 'climate' | 'whatsapp' | 'clinical_safety' | 'shared_api';

export interface ApiLogEntry {
  id: string;
  timestamp: string;
  type: string;
  payload: MetaOutboundPayload;
  messageId: string;
}

export interface WebhookLogEntry {
  id: string;
  timestamp: string;
  event: MetaWebhookEvent;
}

interface DevConsoleState {
  activeTab: ConsoleTab;
  apiLogs: ApiLogEntry[];
  webhookLogs: WebhookLogEntry[];
  sessionVariables: Record<string, any>;
  currentNode: FlowNode | null;

  setActiveTab: (tab: ConsoleTab) => void;
  addApiLog: (log: Omit<ApiLogEntry, 'id'>) => void;
  addWebhookLog: (event: MetaWebhookEvent) => void;
  updateSessionVariables: (vars: Record<string, any>) => void;
  updateCurrentNode: (node: FlowNode | null) => void;
  clearLogs: () => void;
}

export const useDevConsoleStore = create<DevConsoleState>((set) => ({
  activeTab: 'api_logs',
  apiLogs: [],
  webhookLogs: [],
  sessionVariables: {},
  currentNode: null,

  setActiveTab: (tab) => set({ activeTab: tab }),

  addApiLog: (log) =>
    set((state) => ({
      apiLogs: [
        {
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          ...log,
        },
        ...state.apiLogs,
      ].slice(0, 50),
    })),

  addWebhookLog: (event) =>
    set((state) => ({
      webhookLogs: [
        {
          id: `wh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toISOString(),
          event,
        },
        ...state.webhookLogs,
      ].slice(0, 50),
    })),

  updateSessionVariables: (vars) => set({ sessionVariables: { ...vars } }),
  updateCurrentNode: (node) => set({ currentNode: node }),

  clearLogs: () => set({ apiLogs: [], webhookLogs: [] }),
}));
