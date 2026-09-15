import React, { useState } from 'react';
import { useDevConsoleStore } from '../../store/useDevConsoleStore';
import { Radio, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';

export const WebhookTab: React.FC = () => {
  const { webhookLogs } = useDevConsoleStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(webhookLogs[0]?.id || null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (webhookLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center text-slate-500 p-6">
        <Radio className="w-8 h-8 mb-2 opacity-40 text-sky-400" />
        <p className="text-xs">No Meta Webhook Events received yet.</p>
        <p className="text-[11px] text-slate-600 mt-1">
          Inbound messages and delivery receipt webhooks (sent/delivered/read) will stream here live.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3 font-mono text-xs">
      {webhookLogs.map((log) => {
        const isExpanded = expandedId === log.id;
        const jsonString = JSON.stringify(log.event, null, 2);
        const changeVal = log.event?.entry?.[0]?.changes?.[0]?.value;
        const isStatus = !!changeVal?.statuses;
        const statusType = isStatus && changeVal?.statuses?.[0] ? changeVal.statuses[0].status : 'inbound_message';

        return (
          <div key={log.id} className="bg-slate-900/90 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
            <div
              onClick={() => setExpandedId(isExpanded ? null : log.id)}
              className="p-2.5 bg-slate-900 hover:bg-slate-800/80 cursor-pointer flex items-center justify-between border-b border-slate-800/60"
            >
              <div className="flex items-center space-x-2 truncate">
                {isExpanded ? <ChevronDown className="w-4 h-4 text-sky-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                    isStatus
                      ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  WEBHOOK: {statusType.toUpperCase()}
                </span>
                <span className="text-slate-400 text-[10px]">object: whatsapp_business_account</span>
              </div>

              <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(jsonString, log.id);
                  }}
                  className="p-1 hover:text-sky-400 text-slate-400 rounded hover:bg-slate-700/50"
                  title="Copy Webhook JSON Payload"
                >
                  {copiedId === log.id ? <Check className="w-3.5 h-3.5 text-sky-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="p-3 bg-slate-950/80 text-sky-300 font-mono text-[11px] overflow-x-auto leading-relaxed border-t border-slate-800">
                <pre>{jsonString}</pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
