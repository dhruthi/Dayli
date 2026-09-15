import React, { useState, useEffect } from 'react';
import { openAIService } from '../../services/mock';
import { useChatStore } from '../../store/useChatStore';
import { Sparkles, Key, Cpu, Send, Check, ShieldAlert, RefreshCw, Activity, Layers, FileCode } from 'lucide-react';
import { AIOrchestrationMetadata, OpenAIHealthCheckResult } from '../../types/services';
import { PROMPT_VERSION } from '../../services/ai/prompts';
import { openAIClient } from '../../services/ai/client';

export const OpenAITab: React.FC = () => {
  const { sessionState } = useChatStore();
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [healthStatus, setHealthStatus] = useState<OpenAIHealthCheckResult | null>(null);
  const [isHealthTesting, setIsHealthTesting] = useState(false);
  const [connectionLatency, setConnectionLatency] = useState<number | null>(null);

  const [testQuery, setTestQuery] = useState(
    'What should I eat when ambient temperature reaches 42°C in my 2nd trimester?'
  );
  const [testMetadata, setTestMetadata] = useState<AIOrchestrationMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('dayli_openai_api_key') || '';
    const savedModel = localStorage.getItem('dayli_openai_model') || 'gpt-4o-mini';
    setApiKey(savedKey);
    setSelectedModel(savedModel);

    // Initial Health Check
    runHealthCheck(savedKey, savedModel);
  }, []);

  const runHealthCheck = async (keyOverride?: string, modelOverride?: string) => {
    setIsHealthTesting(true);
    const health = await openAIService.checkHealth(keyOverride || apiKey, modelOverride || selectedModel);
    setHealthStatus(health);

    if (health.isConfigured) {
      const conn = await openAIClient.testConnection(keyOverride || apiKey, modelOverride || selectedModel);
      if (conn.success) {
        setConnectionLatency(conn.latencyMs);
      } else {
        setConnectionLatency(null);
      }
    } else {
      setConnectionLatency(null);
    }
    setIsHealthTesting(false);
  };

  const handleSaveSettings = () => {
    localStorage.setItem('dayli_openai_api_key', apiKey.trim());
    localStorage.setItem('dayli_openai_model', selectedModel);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    runHealthCheck(apiKey.trim(), selectedModel);
  };

  const handleTestGenerate = async (presetQuery?: string) => {
    const queryToUse = presetQuery || testQuery;
    if (!queryToUse.trim()) return;
    setIsLoading(true);
    setTestMetadata(null);

    const userProf = sessionState?.userProfile || {
      name: 'Ananya Sharma',
      phoneNumber: '+919876543210',
      language: 'en',
      locationName: 'New Delhi Central',
      trimester: '2nd Trimester',
    };
    const wData = sessionState?.variables.weatherData;

    const metadata = await openAIService.orchestrateQuery({
      userQuery: queryToUse,
      userProfile: userProf,
      weatherData: wData,
      model: selectedModel,
      apiKey: apiKey.trim(),
    });

    setTestMetadata(metadata);
    setIsLoading(false);
  };

  const isConfigured = healthStatus?.isConfigured;

  return (
    <div className="p-3 space-y-4 font-sans text-xs">
      {/* Header Info */}
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-100 font-bold text-xs">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>AI Orchestration Engine v{PROMPT_VERSION}</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center space-x-1 ${
              isConfigured
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>
              {isConfigured
                ? `⚡ OpenAI API Active (${healthStatus?.source.toUpperCase()})`
                : '🤖 WHO Clinical AI Engine Active'}
            </span>
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Intent Router + Specialized Agents (General Care, Clinical Triage, Medication) + Deterministic Safety Layer.
        </p>

        {/* Security & Health Banner */}
        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 flex items-center justify-between text-[11px]">
          <div className="flex items-center space-x-2 text-slate-300">
            <ShieldAlert className="w-3.5 h-3.5 text-sky-400" />
            <span>
              Key: <span className="font-mono text-amber-300">{healthStatus?.maskedKey || 'ENV / Configured'}</span>
            </span>
          </div>
          <div className="flex items-center space-x-2 text-[10px] text-slate-400">
            {connectionLatency !== null && (
              <span className="text-emerald-400 font-mono">Ping: {connectionLatency}ms</span>
            )}
            <button
              onClick={() => runHealthCheck()}
              disabled={isHealthTesting}
              className="hover:text-purple-300 flex items-center space-x-1"
            >
              <RefreshCw className={`w-3 h-3 ${isHealthTesting ? 'animate-spin' : ''}`} />
              <span>Test Health</span>
            </button>
          </div>
        </div>
      </div>

      {/* Model & Security Settings */}
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-3">
        <h4 className="font-semibold text-slate-200 text-xs flex items-center space-x-1.5">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span>Model & Authentication Settings</span>
        </h4>

        {/* Model Selection */}
        <div className="space-y-1">
          <label className="text-slate-400 text-[11px] font-medium block">Select OpenAI Model:</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'gpt-4o-mini', label: 'gpt-4o-mini', badge: 'Default & Fast' },
              { id: 'gpt-4o', label: 'gpt-4o', badge: 'High Reasoning' },
              { id: 'gpt-3.5-turbo', label: 'gpt-3.5-turbo', badge: 'Legacy' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedModel(m.id)}
                className={`p-2 rounded-lg border text-left transition-all ${
                  selectedModel === m.id
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-mono text-xs">{m.label}</div>
                <div className="text-[9px] text-slate-500">{m.badge}</div>
              </button>
            ))}
          </div>
        </div>

        {/* API Key Input */}
        <div className="space-y-1">
          <label className="text-slate-400 text-[11px] font-medium flex items-center justify-between">
            <span className="flex items-center space-x-1">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Override OpenAI API Key (Optional):</span>
            </span>
            <span className="text-[10px] text-slate-500">Stored safely / Never logged</span>
          </label>
          <div className="flex space-x-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-proj-..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono placeholder-slate-600 focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={handleSaveSettings}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center space-x-1"
            >
              {isSaved ? <Check className="w-4 h-4" /> : <span>Save</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Agent & Intent Testing */}
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-slate-200 text-xs flex items-center space-x-1.5">
            <Layers className="w-4 h-4 text-sky-400" />
            <span>AI Orchestration Test Playground</span>
          </h4>
        </div>

        {/* Query Presets */}
        <div className="space-y-1">
          <label className="text-slate-400 text-[10px]">Test Presets:</label>
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <button
              onClick={() => {
                const q = 'How much water should I drink in 42°C heat during 2nd trimester?';
                setTestQuery(q);
                handleTestGenerate(q);
              }}
              className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-left text-slate-300 flex items-center space-x-1"
            >
              <span>☀️ General Care</span>
            </button>

            <button
              onClick={() => {
                const q = 'I am pregnant and feeling faint with severe dizziness and baby is not moving';
                setTestQuery(q);
                handleTestGenerate(q);
              }}
              className="p-1.5 bg-red-950/40 hover:bg-red-900/40 border border-red-800/40 rounded text-left text-red-300 font-semibold flex items-center space-x-1"
            >
              <span>🚨 Emergency Red Flag</span>
            </button>

            <button
              onClick={() => {
                const q = 'I have a mild heat headache and slight nausea after being outside';
                setTestQuery(q);
                handleTestGenerate(q);
              }}
              className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-left text-slate-300 flex items-center space-x-1"
            >
              <span>🩺 Clinical Triage</span>
            </button>

            <button
              onClick={() => {
                const q = 'How should I store my prenatal iron tablets during high heat?';
                setTestQuery(q);
                handleTestGenerate(q);
              }}
              className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-left text-slate-300 flex items-center space-x-1"
            >
              <span>💊 Medication Guidance</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <textarea
            rows={2}
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="Type any custom climate health query..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
          />

          <button
            onClick={() => handleTestGenerate()}
            disabled={isLoading}
            className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center space-x-1.5 shadow"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Orchestrating AI Pipeline...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Run AI Orchestration Pipeline</span>
              </>
            )}
          </button>
        </div>

        {/* Structured Metadata & Response Preview */}
        {testMetadata && (
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-3 font-mono text-[11px]">
            {/* Orchestration Metadata Header */}
            <div className="grid grid-cols-3 gap-2 pb-2 border-b border-slate-800 text-[10px]">
              <div>
                <span className="text-slate-500 block">INTENT:</span>
                <span className="text-purple-400 font-bold uppercase">{testMetadata.intent}</span>
              </div>
              <div>
                <span className="text-slate-500 block">RISK LEVEL:</span>
                <span
                  className={`font-bold ${
                    testMetadata.riskLevel === 'High / Emergency'
                      ? 'text-red-400'
                      : testMetadata.riskLevel === 'Moderate'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {testMetadata.riskLevel}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">REFERRAL:</span>
                <span className={testMetadata.requiresReferral ? 'text-red-400 font-bold' : 'text-slate-400'}>
                  {testMetadata.requiresReferral ? 'YES (Generated)' : 'NO'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>Engine: {testMetadata.modelUsed}</span>
              <span>
                {testMetadata.latencyMs}ms | Tokens: {testMetadata.tokensUsed}
              </span>
            </div>

            {/* Generated WhatsApp Markdown Response */}
            <div className="text-slate-200 whitespace-pre-wrap font-sans text-xs leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              {testMetadata.response}
            </div>

            {/* Safety & Referral Details */}
            {testMetadata.referralTicket && (
              <div className="bg-red-950/40 p-2 rounded-lg border border-red-800/40 space-y-1 text-[10px]">
                <div className="font-bold text-red-300 flex items-center space-x-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>DETERMINISTIC EMERGENCY TICKET CREATED</span>
                </div>
                <div className="text-slate-300">
                  ID: <span className="font-bold">{testMetadata.referralTicket.referralId}</span> | Facility:{' '}
                  {testMetadata.referralTicket.facilityName}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
