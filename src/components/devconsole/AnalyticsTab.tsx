import React, { useEffect, useState } from 'react';
import { analyticsService } from '../../services/mock';
import { AnalyticsMetrics } from '../../types/services';
import { BarChart3, Users, AlertTriangle, CheckCircle2, Clock, Activity } from 'lucide-react';

export const AnalyticsTab: React.FC = () => {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);

  useEffect(() => {
    analyticsService.getMetrics().then((data) => setMetrics(data));
  }, []);

  if (!metrics) {
    return <div className="p-6 text-center text-slate-500 text-xs">Loading analytics data...</div>;
  }

  const kpis = [
    { title: 'Conversations Started', value: metrics.totalConversationsStarted.toLocaleString(), icon: Users, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
    { title: 'Referrals Generated', value: metrics.totalReferralsGenerated.toLocaleString(), icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { title: 'Completion Rate', value: `${metrics.workflowCompletionRatePercent}%`, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { title: 'Avg Latency / Completion', value: `${metrics.averageCompletionTimeSeconds}s`, icon: Clock, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  ];

  return (
    <div className="p-3 space-y-4 font-sans text-xs">
      <div className="flex items-center space-x-2 text-slate-200 font-semibold border-b border-slate-800 pb-2">
        <BarChart3 className="w-4 h-4 text-emerald-400" />
        <span>Real-Time Clinical & System Performance Metrics</span>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className={`p-3 rounded-xl border ${kpi.bg} space-y-1 shadow-sm`}>
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>{kpi.title}</span>
                <Icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <div className={`text-xl font-bold font-mono ${kpi.color}`}>{kpi.value}</div>
            </div>
          );
        })}
      </div>

      {/* Workflow Breakdown */}
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2">
        <h4 className="font-semibold text-slate-200 text-xs flex items-center space-x-1.5">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>Active Workflow Engagement Distribution</span>
        </h4>

        <div className="space-y-2 pt-1 font-mono text-[11px]">
          {Object.entries(metrics.activeWorkflowsCount).map(([wfId, count]) => {
            const pct = Math.round((count / (metrics.totalConversationsStarted || 1)) * 100);
            return (
              <div key={wfId} className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span className="capitalize">{wfId.replace('-', ' ')}</span>
                  <span className="text-emerald-400">{count} sessions ({pct}%)</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
