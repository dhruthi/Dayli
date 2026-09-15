import React from 'react';
import { useChatStore } from '../../store/useChatStore';
import { GitBranch, CheckCircle, ArrowRight } from 'lucide-react';

export const NodeTrackerTab: React.FC = () => {
  const { sessionState, activeFlow } = useChatStore();

  const currentNodeId = sessionState?.currentNodeId;
  const currentNode = activeFlow?.nodes[currentNodeId || ''];
  const stepHistory = sessionState?.stepHistory || [];

  return (
    <div className="p-3 space-y-4 font-mono text-xs">
      {/* Active Node Info */}
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center space-x-2 text-emerald-400 font-sans font-semibold">
          <GitBranch className="w-4 h-4" />
          <span>Current Active Workflow Node</span>
        </div>

        {currentNode ? (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400">Node ID:</span>
              <span className="bg-slate-800 text-emerald-300 font-bold px-2 py-0.5 rounded border border-slate-700">
                {currentNode.id}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-slate-400">Node Type:</span>
              <span className="text-amber-300 font-bold">{currentNode.type}</span>
            </div>
            {currentNode.next && (
              <div className="flex items-center space-x-2 text-slate-300">
                <span className="text-slate-400">Default Next:</span>
                <span className="text-slate-200">{currentNode.next}</span>
              </div>
            )}
            {currentNode.condition && (
              <div className="p-2 rounded bg-slate-950/80 border border-slate-800 space-y-1 text-[11px]">
                <div className="text-amber-400 font-bold">Condition Branch Solver:</div>
                <div className="text-slate-300">
                  Variable: <code className="text-sky-300">{currentNode.condition.variable}</code>
                </div>
                <div className="text-slate-300">
                  Operator: <code className="text-emerald-300">{currentNode.condition.operator}</code>
                </div>
                <div className="text-slate-300">
                  Target Value: <code className="text-amber-300">{String(currentNode.condition.value)}</code>
                </div>
                <div className="text-slate-400 flex items-center space-x-2 pt-0.5">
                  <span>If True: <strong className="text-emerald-400">{currentNode.condition.nextIfTrue}</strong></span>
                  <span>|</span>
                  <span>If False: <strong className="text-red-400">{currentNode.condition.nextIfFalse}</strong></span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-slate-500 text-xs">Workflow execution finished or idle.</p>
        )}
      </div>

      {/* Step History */}
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2">
        <h4 className="font-sans font-semibold text-slate-200 text-xs flex items-center space-x-1.5">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>Execution Path History ({stepHistory.length} nodes)</span>
        </h4>

        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {stepHistory.map((stepId, idx) => (
            <div
              key={idx}
              className={`p-2 rounded-lg border flex items-center justify-between text-[11px] ${
                stepId === currentNodeId
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="w-5 text-slate-500 text-right">{idx + 1}.</span>
                <span>{stepId}</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
