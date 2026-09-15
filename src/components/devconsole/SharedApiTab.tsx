import React, { useState, useEffect } from 'react';
import { sharedApiRouter } from '../../services/api/sharedApiRouter';
import { authService } from '../../services/api/authService';
import { Server, Send, LayoutDashboard, ShieldCheck, Activity, Globe, MessageSquare, Terminal } from 'lucide-react';
import { UniversalChatMessageOutput, DashboardSummaryResponse, RequestChannel } from '../../services/api/types';

export const SharedApiTab: React.FC = () => {
  const [channel, setChannel] = useState<RequestChannel>('web');
  const [testQuery, setTestQuery] = useState('What hydration target is recommended in 42°C heat?');
  const [chatOutput, setChatOutput] = useState<UniversalChatMessageOutput | null>(null);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummaryResponse | null>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [adminToken, setAdminToken] = useState('dev_admin_token');
  const [adminStats, setAdminStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    runHealthCheck();
    fetchDashboard();
  }, []);

  const runHealthCheck = async () => {
    const res = await sharedApiRouter.handleHealthCheck();
    setHealthStatus(res.data);
  };

  const fetchDashboard = async () => {
    const res = await sharedApiRouter.handleGetDashboardSummary();
    if (res.success && res.data) {
      setDashboardSummary(res.data);
    }
  };

  const handleTestChat = async () => {
    if (!testQuery.trim()) return;
    setIsLoading(true);
    setChatOutput(null);

    const res = await sharedApiRouter.handleChatMessage({
      session_id: `sess_web_${Date.now()}`,
      message: testQuery,
      channel,
      user_name: 'Ananya Sharma (Website User)',
    });

    if (res.success && res.data) {
      setChatOutput(res.data);
    } else {
      alert(`API Error: ${res.error?.message}`);
    }
    setIsLoading(false);
  };

  const handleTestAdminStats = async () => {
    const res = await sharedApiRouter.handleAdminStats(adminToken);
    if (res.success) {
      setAdminStats(res.data);
    } else {
      setAdminStats({ error: res.error?.message });
    }
  };

  return (
    <div className="p-3 space-y-4 font-sans text-xs">
      {/* Header Banner */}
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-100 font-bold text-xs">
            <Server className="w-4 h-4 text-sky-400" />
            <span>Shared API Backend Architecture</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center space-x-1">
            <Activity className="w-3 h-3" />
            <span>API Gateway UP</span>
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Unified REST API endpoints (`/api/*`) serving Dayli.ai Website, WhatsApp Cloud API, and Simulator from 100% shared business logic.
        </p>
      </div>

      {/* Channel Switcher & Universal Chat API Tester */}
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-slate-200 text-xs flex items-center space-x-1.5">
            <Send className="w-4 h-4 text-emerald-400" />
            <span>Universal Chat Endpoint (POST /api/chat/message)</span>
          </h4>
          <div className="flex space-x-1 font-mono text-[10px]">
            {[
              { id: 'web', label: '🌐 Website', icon: Globe },
              { id: 'whatsapp', label: '💬 WhatsApp', icon: MessageSquare },
              { id: 'simulator', label: '🤖 Simulator', icon: Terminal },
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => setChannel(c.id as any)}
                className={`px-2 py-0.5 rounded border transition-colors ${
                  channel === c.id
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <textarea
            rows={2}
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-sans"
          />

          <button
            onClick={handleTestChat}
            disabled={isLoading}
            className="w-full py-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center space-x-1.5 shadow"
          >
            <span>Execute API Request (Channel: {channel.toUpperCase()})</span>
          </button>
        </div>

        {chatOutput && (
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 font-mono text-[10px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-slate-400">
              <span className="text-emerald-400 font-bold">INTENT: {chatOutput.intent}</span>
              <span className="text-purple-300 font-bold">RISK: {chatOutput.risk_level}</span>
              <span className="text-slate-500">{chatOutput.metadata.latency_ms}ms ({chatOutput.metadata.channel.toUpperCase()})</span>
            </div>

            <div className="text-slate-200 font-sans text-xs leading-relaxed bg-slate-900/60 p-2 rounded border border-slate-800">
              {chatOutput.message}
            </div>

            {chatOutput.referral && (
              <div className="bg-red-950/40 p-2 rounded border border-red-800/40 text-red-300">
                Ticket: {chatOutput.referral.ticket_id} | Facility: {chatOutput.referral.facility_name}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Web Dashboard Summary API Inspector */}
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-3">
        <h4 className="font-semibold text-slate-200 text-xs flex items-center space-x-1.5">
          <LayoutDashboard className="w-4 h-4 text-purple-400" />
          <span>Web Dashboard Overview API (GET /api/dashboard/summary)</span>
        </h4>

        {dashboardSummary && (
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 font-mono text-[10px]">
            <div className="grid grid-cols-3 gap-2 border-b border-slate-800 pb-1">
              <div>
                <span className="text-slate-500 block">USER:</span>
                <span className="text-slate-200 font-bold">{dashboardSummary.user.name} ({dashboardSummary.user.trimester})</span>
              </div>
              <div>
                <span className="text-slate-500 block">TEMP & AQI:</span>
                <span className="text-amber-300 font-bold">{dashboardSummary.current_climate.temperature_c}°C | AQI {dashboardSummary.current_climate.aqi}</span>
              </div>
              <div>
                <span className="text-slate-500 block">HYDRATION:</span>
                <span className="text-sky-300 font-bold">{dashboardSummary.hydration_target.target_liters} Liters/day</span>
              </div>
            </div>
            <div className="text-slate-400 text-[9px]">
              Overall Risk: <span className="text-purple-400 uppercase font-bold">{dashboardSummary.risk_assessment.overall_climate_risk}</span>
            </div>
          </div>
        )}
      </div>

      {/* Admin Role Access Control */}
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-200 text-xs flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Admin Stats Endpoint (GET /api/admin/stats)</span>
          </span>
          <button
            onClick={handleTestAdminStats}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold rounded transition-colors"
          >
            Test Admin Token
          </button>
        </div>

        <input
          type="text"
          value={adminToken}
          onChange={(e) => setAdminToken(e.target.value)}
          placeholder="Bearer token..."
          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
        />

        {adminStats && (
          <pre className="bg-slate-950 p-2 rounded border border-slate-800 font-mono text-[9px] text-slate-300 overflow-x-auto">
            {JSON.stringify(adminStats, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};
