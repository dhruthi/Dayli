import React from 'react';
import { useDevConsoleStore, ConsoleTab } from '../../store/useDevConsoleStore';
import { Terminal, Radio, Database, GitBranch, FileCode, BarChart3, Sparkles, CloudSun, MessageSquare, ShieldCheck, Server, Trash2 } from 'lucide-react';

export const DevConsoleHeader: React.FC = () => {
  const { activeTab, setActiveTab, clearLogs, apiLogs, webhookLogs } = useDevConsoleStore();

  const tabs: Array<{ id: ConsoleTab; label: string; icon: any; count?: number }> = [
    { id: 'api_logs', label: 'API Outbound', icon: Terminal, count: apiLogs.length },
    { id: 'webhooks', label: 'Webhooks', icon: Radio, count: webhookLogs.length },
    { id: 'variables', label: 'Session State', icon: Database },
    { id: 'flow_tracker', label: 'Flow Graph', icon: GitBranch },
    { id: 'templates', label: 'Templates', icon: FileCode },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'openai', label: 'OpenAI Model', icon: Sparkles },
    { id: 'climate', label: 'Climate Service', icon: CloudSun },
    { id: 'whatsapp', label: 'WhatsApp Cloud API', icon: MessageSquare },
    { id: 'clinical_safety', label: 'Clinical Safety', icon: ShieldCheck },
    { id: 'shared_api', label: 'Shared REST API', icon: Server },
  ];

  return (
    <div className="bg-slate-900 border-b border-slate-800 p-2 flex items-center justify-between overflow-x-auto">
      <div className="flex items-center space-x-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-emerald-400 font-mono">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={clearLogs}
        title="Clear Console Logs"
        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors ml-2"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};
