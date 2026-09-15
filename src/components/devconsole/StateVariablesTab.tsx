import React, { useState } from 'react';
import { useDevConsoleStore } from '../../store/useDevConsoleStore';
import { Database, Copy, Check } from 'lucide-react';

export const StateVariablesTab: React.FC = () => {
  const { sessionVariables } = useDevConsoleStore();
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(sessionVariables, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-3 space-y-3 font-mono text-xs">
      <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-2 text-slate-200 font-sans font-medium">
          <Database className="w-4 h-4 text-amber-400" />
          <span>Active Patient Session State & Variables</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-sans text-xs transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy State JSON'}</span>
        </button>
      </div>

      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-amber-300 font-mono text-[11px] overflow-x-auto leading-relaxed shadow-inner">
        <pre>{jsonString}</pre>
      </div>
    </div>
  );
};
