import React from 'react';
import { usePresentationStore, SpeedMultiplier } from '../../store/usePresentationStore';
import { useChatStore } from '../../store/useChatStore';
import { WORKFLOW_LIST } from '../../flows';
import { Play, Pause, RotateCcw, FastForward, Sparkles, Sliders } from 'lucide-react';

export const PresentationBar: React.FC = () => {
  const { isPresentationMode, isPlaying, speedMultiplier, togglePlayPause, setSpeed } =
    usePresentationStore();
  const { activeWorkflowId, selectWorkflow, restartWorkflow } = useChatStore();

  if (!isPresentationMode) return null;

  const speeds: SpeedMultiplier[] = [0.5, 1, 2, 4];

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border-b border-amber-500/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-slate-100 shadow-xl z-30">
      {/* Presentation Status Label */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          <span>PRESENTATION MODE ACTIVE</span>
        </div>

        {/* Workflow Quick Switcher */}
        <select
          value={activeWorkflowId}
          onChange={(e) => selectWorkflow(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-400"
        >
          {WORKFLOW_LIST.map((wf) => (
            <option key={wf.id} value={wf.id}>
              {wf.badge}: {wf.title}
            </option>
          ))}
        </select>
      </div>

      {/* Control Deck */}
      <div className="flex items-center space-x-3">
        {/* Play/Pause */}
        <button
          onClick={togglePlayPause}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold shadow transition-all ${
            isPlaying
              ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
              : 'bg-emerald-600 text-white hover:bg-emerald-500'
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-slate-950" />
              <span>PAUSE</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
              <span>PLAY DEMO</span>
            </>
          )}
        </button>

        {/* Speed Multipliers */}
        <div className="flex items-center space-x-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
                speedMultiplier === s
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Restart */}
        <button
          onClick={restartWorkflow}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="Restart Workflow"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
