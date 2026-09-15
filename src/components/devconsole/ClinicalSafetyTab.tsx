import React, { useState, useEffect } from 'react';
import { RED_FLAG_RULES, RED_FLAG_RULE_VERSION } from '../../services/clinical/redFlagRules';
import { clinicalSafetyEngine } from '../../services/clinical/clinicalSafetyEngine';
import { clinicalAuditLogger } from '../../services/clinical/clinicalAuditLogger';
import { useChatStore } from '../../store/useChatStore';
import { ShieldCheck, AlertTriangle, FileText, Activity, RefreshCw, Send, CheckCircle2 } from 'lucide-react';
import { ClinicalSafetyResult, ClinicalAuditEntry } from '../../services/clinical/types';

export const ClinicalSafetyTab: React.FC = () => {
  const { sessionState } = useChatStore();
  const [testQuery, setTestQuery] = useState('I am in 2nd trimester feeling dizzy and baby is not moving');
  const [testResult, setTestResult] = useState<ClinicalSafetyResult | null>(null);
  const [auditLogs, setAuditLogs] = useState<ClinicalAuditEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    runTestEval();
    refreshAuditLogs();
  }, []);

  const refreshAuditLogs = () => {
    setAuditLogs(clinicalAuditLogger.getAuditLogs());
  };

  const runTestEval = () => {
    const userProf = sessionState?.userProfile || { name: 'Ananya Sharma', phoneNumber: '+919876543210', language: 'en', trimester: '2nd Trimester' };
    const res = clinicalSafetyEngine.evaluate({
      userQuery: testQuery,
      userProfile: userProf,
    });
    setTestResult(res);
    refreshAuditLogs();
  };

  const filteredRules = RED_FLAG_RULES.filter(
    (r) => activeCategory === 'all' || r.category === activeCategory
  );

  return (
    <div className="p-3 space-y-4 font-sans text-xs">
      {/* Header Banner */}
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-100 font-bold text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Deterministic Clinical Safety Engine v{RED_FLAG_RULE_VERSION}</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Non-Overridable Rule Authority</span>
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          OpenAI provides natural language translation and empathy. Deterministic rules control risk scoring, red flags, emergency escalation, and ticket generation.
        </p>
      </div>

      {/* Red Flag Rule Registry */}
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-slate-200 text-xs flex items-center space-x-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Configurable Red-Flag Rule Registry ({RED_FLAG_RULES.length} Rules)</span>
          </h4>
          <div className="flex space-x-1">
            {['all', 'fetal_distress', 'cns_heatstroke', 'maternal_severe', 'pediatric_heat'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2 py-0.5 rounded text-[9px] font-mono transition-colors ${
                  activeCategory === cat
                    ? 'bg-purple-600 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cat.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
          {filteredRules.map((rule) => (
            <div key={rule.id} className="bg-slate-950 p-2 rounded-lg border border-slate-800 space-y-1 font-mono text-[10px]">
              <div className="flex items-center justify-between">
                <span className="text-purple-400 font-bold">{rule.id}: {rule.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold ${
                    rule.riskLevel === 'emergency'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {rule.riskLevel}
                </span>
              </div>
              <p className="text-slate-400 text-[10px] font-sans">{rule.description}</p>
              <div className="text-slate-500 text-[9px]">Code: <span className="text-amber-300">{rule.reasonCode}</span></div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Safety Rule Evaluator */}
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-3">
        <h4 className="font-semibold text-slate-200 text-xs flex items-center space-x-1.5">
          <Send className="w-4 h-4 text-sky-400" />
          <span>Interactive Rule Evaluator & Safety Override Check</span>
        </h4>

        <div className="space-y-2">
          <textarea
            rows={2}
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
          />

          <button
            onClick={runTestEval}
            className="w-full py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center space-x-1.5"
          >
            <span>Evaluate Clinical Safety Rules</span>
          </button>
        </div>

        {testResult && (
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 font-mono text-[11px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-[10px]">
              <div>
                RISK LEVEL: <span className={`font-bold uppercase ${testResult.risk_level === 'emergency' ? 'text-red-400' : 'text-emerald-400'}`}>{testResult.risk_level}</span>
              </div>
              <div>REFERRAL: <span className={testResult.requires_referral ? 'text-red-400 font-bold' : 'text-slate-400'}>{testResult.requires_referral ? 'REQUIRED' : 'NONE'}</span></div>
            </div>

            <div className="text-slate-300 text-[10px] space-y-1">
              <div>Red Flags: <span className="text-amber-300 font-bold">{testResult.red_flags.join(', ') || 'None'}</span></div>
              <div>Reason Codes: <span className="text-purple-300">{testResult.reason_codes.join(', ') || 'ROUTINE'}</span></div>
            </div>

            {testResult.referral_ticket && (
              <div className="bg-red-950/40 p-2 rounded border border-red-800/40 text-[10px] space-y-0.5">
                <div className="text-red-300 font-bold">REFERRAL TICKET CREATED</div>
                <div className="text-slate-300">ID: {testResult.referral_ticket.ticket_id} | Status: {testResult.referral_ticket.status}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Live Audit Log Inspector */}
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-slate-200 text-xs flex items-center space-x-1.5">
            <FileText className="w-4 h-4 text-purple-400" />
            <span>Clinical Audit Trail Log ({auditLogs.length} Entries)</span>
          </h4>
          <button onClick={refreshAuditLogs} className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center space-x-1 font-semibold">
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="space-y-1.5 max-h-40 overflow-y-auto font-mono text-[10px]">
          {auditLogs.slice(0, 5).map((log, idx) => (
            <div key={idx} className="bg-slate-950 p-2 rounded border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-500">{log.timestamp.substring(11, 19)}</span> | req: {log.request_id}
                <div className="text-slate-300">Reasons: {log.reason_codes.join(', ') || 'Routine'}</div>
              </div>
              <div className="text-right">
                <span className={`font-bold uppercase ${log.risk_level === 'emergency' ? 'text-red-400' : 'text-emerald-400'}`}>{log.risk_level}</span>
                <div className="text-slate-500 text-[9px]">v{log.rule_version}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
