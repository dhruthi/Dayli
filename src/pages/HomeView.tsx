import React from 'react';
import { WORKFLOW_LIST } from '../flows';
import { useChatStore } from '../store/useChatStore';
import { usePresentationStore } from '../store/usePresentationStore';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, ShieldCheck, HeartPulse, Pill, Play } from 'lucide-react';

export const HomeView: React.FC = () => {
  const { selectWorkflow } = useChatStore();
  const { setPresentationMode } = usePresentationStore();
  const navigate = useNavigate();

  const handleLaunchWorkflow = (workflowId: string, autoPlay = false) => {
    selectWorkflow(workflowId);
    if (autoPlay) {
      setPresentationMode(true);
    }
    navigate('/simulator');
  };

  const getWorkflowIcon = (id: string) => {
    switch (id) {
      case 'general-care':
        return ShieldCheck;
      case 'referral':
        return HeartPulse;
      case 'medication':
        return Pill;
      default:
        return Sparkles;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Header Banner */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 text-2xl font-black shadow-lg shadow-emerald-500/20">
              ☀️
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight font-sans text-slate-100 flex items-center space-x-2">
                <span>dayli.ai</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                  CLIMATE HEALTH COPILOT
                </span>
              </h1>
              <p className="text-xs text-slate-400">WhatsApp Business Cloud API Simulator & Developer Portal</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleLaunchWorkflow('general-care', true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>PRESENTATION AUTO-PLAY</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex-1 flex flex-col justify-center space-y-8">
        {/* Title Hero */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-xs font-semibold border border-emerald-500/20">
            PHASE 1 SIMULATOR • META BUSINESS READY
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-100">
            Simulate Complete WhatsApp Business Flows for Climate Health
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Experience pixel-perfect WhatsApp Business interactions. The first message lets users choose between General Care & Climate Alerts, Clinical Triage & Referral, or Medication Adherence & Storage.
          </p>
        </div>

        {/* 3 Healthcare Workflow Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {WORKFLOW_LIST.map((wf) => {
            const Icon = getWorkflowIcon(wf.id);
            return (
              <div
                key={wf.id}
                className="group bg-slate-900/80 hover:bg-slate-900 rounded-2xl p-6 border border-slate-800 hover:border-emerald-500/50 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/10 flex flex-col justify-between space-y-6 relative overflow-hidden"
              >
                {/* Decorative glow background */}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />

                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-emerald-400 font-bold text-xs border border-slate-700">
                      {wf.badge}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">{wf.estimatedDuration}</span>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                        {wf.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{wf.description}</p>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
                    <strong className="text-slate-400">Target Persona:</strong> {wf.targetAudience}
                  </div>
                </div>

                {/* Launch Action */}
                <div className="flex items-center space-x-3 pt-2 relative z-10">
                  <button
                    onClick={() => handleLaunchWorkflow(wf.id, false)}
                    className="flex-1 py-2.5 px-4 bg-[#00a884] hover:bg-[#029071] text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 group-hover:shadow-emerald-500/20"
                  >
                    <span>Launch Simulator</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleLaunchWorkflow(wf.id, true)}
                    className="py-2.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/30 transition-all flex items-center justify-center space-x-1"
                    title="Auto-Play Presentation"
                  >
                    <Play className="w-3.5 h-3.5 fill-amber-300" />
                    <span>Auto</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/40 py-6 text-center text-xs text-slate-500">
        <p>dayli.ai — Climate Health Copilot • Designed for Meta WhatsApp Business Cloud API Integration</p>
      </footer>
    </div>
  );
};
