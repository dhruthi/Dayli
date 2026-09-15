import React from 'react';
import { useDevConsoleStore } from '../../store/useDevConsoleStore';
import { DevConsoleHeader } from './DevConsoleHeader';
import { ApiLogTab } from './ApiLogTab';
import { WebhookTab } from './WebhookTab';
import { StateVariablesTab } from './StateVariablesTab';
import { NodeTrackerTab } from './NodeTrackerTab';
import { TemplateManagerTab } from './TemplateManagerTab';
import { AnalyticsTab } from './AnalyticsTab';
import { OpenAITab } from './OpenAITab';
import { ClimateTab } from './ClimateTab';
import { WhatsAppTab } from './WhatsAppTab';
import { ClinicalSafetyTab } from './ClinicalSafetyTab';
import { SharedApiTab } from './SharedApiTab';

export const DevConsoleContainer: React.FC = () => {
  const { activeTab } = useDevConsoleStore();

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Dev Console Header */}
      <DevConsoleHeader />

      {/* Tab Body Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'api_logs' && <ApiLogTab />}
        {activeTab === 'webhooks' && <WebhookTab />}
        {activeTab === 'variables' && <StateVariablesTab />}
        {activeTab === 'flow_tracker' && <NodeTrackerTab />}
        {activeTab === 'templates' && <TemplateManagerTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'openai' && <OpenAITab />}
        {activeTab === 'climate' && <ClimateTab />}
        {activeTab === 'whatsapp' && <WhatsAppTab />}
        {activeTab === 'clinical_safety' && <ClinicalSafetyTab />}
        {activeTab === 'shared_api' && <SharedApiTab />}
      </div>
    </div>
  );
};
