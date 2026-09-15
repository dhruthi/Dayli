import React, { useState } from 'react';
import { useDevConsoleStore, ApiLogEntry } from '../../store/useDevConsoleStore';
import { Copy, Check, ChevronDown, ChevronRight, Send } from 'lucide-react';

export const ApiLogTab: React.FC = () => {
  const { apiLogs } = useDevConsoleStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(apiLogs[0]?.id || null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (apiLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center text-slate-500 p-6">
        <Send className="w-8 h-8 mb-2 opacity-40 text-emerald-400" />
        <p className="text-xs">No Meta WhatsApp Cloud API requests logged yet.</p>
        <p className="text-[11px] text-slate-600 mt-1">Start a conversation on the WhatsApp Simulator pane to view outbound JSON payloads.</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3 font-mono text-xs">
      {apiLogs.map((log) => {
        const isExpanded = expandedId === log.id;
        const jsonString = JSON.stringify(log.payload, null, 2);

        return (
          <div
            key={log.id}
            className="bg-slate-900/90 rounded-xl border border-slate-800 overflow-hidden shadow-sm"
          >
            {/* Log Entry Header */}
            <div
              onClick={() => setExpandedId(isExpanded ? null : log.id)}
              className="p-2.5 bg-slate-900 hover:bg-slate-800/80 cursor-pointer flex items-center justify-between border-b border-slate-800/60"
            >
              <div className="flex items-center space-x-2 truncate">
                {isExpanded ? <ChevronDown className="w-4 h-4 text-emerald-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  POST /v18.0/messages
                </span>
                <span className="text-slate-300 font-sans text-xs font-semibold">{log.type.toUpperCase()}</span>
                <span className="text-slate-500 text-[10px] truncate">({log.messageId})</span>
              </div>

              <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(jsonString, log.id);
                  }}
                  className="p-1 hover:text-emerald-400 text-slate-400 rounded hover:bg-slate-700/50"
                  title="Copy Meta API JSON Payload"
                >
                  {copiedId === log.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Expanded JSON Body */}
            {isExpanded && (
              <div className="p-3 bg-slate-950/80 text-emerald-300 font-mono text-[11px] overflow-x-auto leading-relaxed border-t border-slate-800">
                <pre>{jsonString}</pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
