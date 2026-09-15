import React, { useState } from 'react';
import { useChatStore } from '../store/useChatStore';
import { usePresentationStore } from '../store/usePresentationStore';
import { usePresentationAutoPlay } from '../hooks/usePresentationAutoPlay';
import { WORKFLOW_LIST } from '../flows';
import { DevConsoleContainer } from '../components/devconsole/DevConsoleContainer';
import { WhatsAppContainer } from '../components/chat/WhatsAppContainer';
import { PresentationBar } from '../components/presentation/PresentationBar';
import { useNavigate } from 'react-router-dom';
import { Home, Sparkles, SlidersHorizontal, RotateCcw } from 'lucide-react';

export const SimulatorView: React.FC = () => {
  const { activeWorkflowId, activeFlow, selectWorkflow, restartWorkflow } = useChatStore();
  const { isPresentationMode, togglePresentationMode } = usePresentationStore();
  const [showConsole, setShowConsole] = useState(true);
  const navigate = useNavigate();

  // Attach presentation auto-play hook
  usePresentationAutoPlay();

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Top Header Controls Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between z-30 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center space-x-1.5 text-xs font-semibold"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </button>

          <div className="h-4 w-px bg-slate-800" />

          {/* Workflow Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 hidden md:inline">Workflow:</span>
            <select
              value={activeWorkflowId}
              onChange={(e) => selectWorkflow(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-400"
            >
              {WORKFLOW_LIST.map((wf) => (
                <option key={wf.id} value={wf.id}>
                  {wf.badge}: {wf.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={restartWorkflow}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors flex items-center space-x-1"
            title="Restart Active Flow"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reset</span>
          </button>

          <button
            onClick={togglePresentationMode}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shadow ${
              isPresentationMode
                ? 'bg-amber-500 text-slate-950 shadow-amber-500/20'
                : 'bg-slate-800 text-amber-300 hover:bg-slate-700 border border-amber-500/30'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isPresentationMode ? 'Exit Presentation' : 'Presentation Mode'}</span>
          </button>

          <button
            onClick={() => setShowConsole(!showConsole)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors flex items-center space-x-1"
            title="Toggle Developer Console"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{showConsole ? 'Hide Console' : 'Show Console'}</span>
          </button>
        </div>
      </header>

      {/* Floating Presentation Deck Bar */}
      <PresentationBar />

      {/* Main Two-Column Simulator Layout */}
      <div className="flex-1 overflow-hidden p-3 md:p-4 flex gap-4">
        {/* Left Pane: Developer Console */}
        {showConsole && (
          <div className="flex-1 hidden lg:flex h-full min-w-0 transition-all">
            <DevConsoleContainer />
          </div>
        )}

        {/* Right Pane: WhatsApp Simulator */}
        <div className="w-full lg:w-[420px] xl:w-[460px] h-full flex-shrink-0 mx-auto transition-all">
          <WhatsAppContainer />
        </div>
      </div>
    </div>
  );
};
