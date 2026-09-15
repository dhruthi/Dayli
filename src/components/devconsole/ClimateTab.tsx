import React, { useState, useEffect } from 'react';
import { climateService, ClimateIntelligenceResult } from '../../services/climate/climateService';
import { useChatStore } from '../../store/useChatStore';
import { CloudSun, Cpu, RefreshCw, Activity, ShieldCheck, Database, MapPin, Droplets, Thermometer, Wind, Eye } from 'lucide-react';
import { ClimateServiceStatus } from '../../services/climate/types';

export const ClimateTab: React.FC = () => {
  const { sessionState } = useChatStore();
  const [providerType, setProviderType] = useState<'auto' | 'real' | 'mock'>('auto');
  const [status, setStatus] = useState<ClimateServiceStatus | null>(null);
  const [latestData, setLatestData] = useState<ClimateIntelligenceResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testLocation, setTestLocation] = useState('New Delhi');

  useEffect(() => {
    refreshStatus();
    runClimateFetch('New Delhi');
  }, []);

  const refreshStatus = () => {
    setStatus(climateService.getStatus());
    setProviderType(climateService.getProviderType());
  };

  const handleProviderChange = (type: 'auto' | 'real' | 'mock') => {
    climateService.setProviderType(type);
    setProviderType(type);
    refreshStatus();
    runClimateFetch(testLocation, true);
  };

  const runClimateFetch = async (locName: string, force: boolean = false) => {
    setIsLoading(true);
    const userProf = sessionState?.userProfile || { name: 'Ananya Sharma', phoneNumber: '', language: 'en', trimester: '2nd Trimester' };
    const intel = await climateService.getClimateIntelligence({
      locationName: locName,
      userProfile: userProf,
      forceRefresh: force,
    });
    setLatestData(intel);
    refreshStatus();
    setIsLoading(false);
  };

  return (
    <div className="p-3 space-y-4 font-sans text-xs">
      {/* Header Info */}
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-100 font-bold text-xs">
            <CloudSun className="w-4 h-4 text-amber-400" />
            <span>Climate Intelligence Provider Architecture</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center space-x-1 ${
              status?.sourceType === 'real'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : status?.sourceType === 'mock_fallback'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>
              {status?.sourceType === 'real'
                ? '⚡ Real Weather API Active'
                : status?.sourceType === 'mock_fallback'
                ? '⚠️ Real API Fallback → Mock Active'
                : '🤖 Micro-Zone Simulator Active'}
            </span>
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Decoupled Weather Providers + Climate Data Normalizer + Deterministic Health Risk & Hydration Engines.
        </p>

        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between text-[11px] text-slate-300">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>API Key: <span className="font-mono text-amber-300">{status?.maskedApiKey || 'Open-Meteo Keyless / Configured'}</span></span>
          </div>
          <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono">
            <span>Cache: {status?.cachedEntriesCount || 0} entries</span>
            {status?.lastRequestLatencyMs !== undefined && (
              <span className="text-emerald-400">{status.lastRequestLatencyMs}ms</span>
            )}
          </div>
        </div>
      </div>

      {/* Provider Selector Card */}
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-3">
        <h4 className="font-semibold text-slate-200 text-xs flex items-center space-x-1.5">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span>Weather Provider Selection</span>
        </h4>

        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'auto', label: 'Auto (Real + Fallback)', badge: 'Recommended' },
            { id: 'real', label: 'Real API Only', badge: 'Open-Meteo / OWM' },
            { id: 'mock', label: 'Mock Simulator', badge: 'Development' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => handleProviderChange(p.id as any)}
              className={`p-2 rounded-lg border text-left transition-all ${
                providerType === p.id
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-mono text-xs">{p.label}</div>
              <div className="text-[9px] text-slate-500">{p.badge}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Location & Data Preview */}
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-slate-200 text-xs flex items-center space-x-1.5">
            <Database className="w-4 h-4 text-sky-400" />
            <span>Live Normalized Climate & Risk Inspector</span>
          </h4>
          <button
            onClick={() => runClimateFetch(testLocation, true)}
            disabled={isLoading}
            className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center space-x-1 font-semibold"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Fetch Fresh</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {['New Delhi', 'Mumbai', 'Kolkata', 'Hyderabad', 'Jaipur', 'Chennai'].map((loc) => (
            <button
              key={loc}
              onClick={() => {
                setTestLocation(loc);
                runClimateFetch(loc, true);
              }}
              className={`px-2.5 py-1 rounded text-[10px] font-semibold border transition-all ${
                testLocation === loc
                  ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {loc}
            </button>
          ))}
        </div>

        {latestData && (
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-3 font-mono text-[11px]">
            {/* Normalized Data Row */}
            <div className="grid grid-cols-4 gap-2 pb-2 border-b border-slate-800 text-[10px]">
              <div>
                <span className="text-slate-500 block flex items-center"><Thermometer className="w-3 h-3 mr-0.5 text-red-400" /> TEMP</span>
                <span className="text-slate-100 font-bold">{latestData.normalized.temperature_c}°C</span>
                <span className="text-[9px] text-slate-500 block">Feels {latestData.normalized.feels_like_c}°C</span>
              </div>
              <div>
                <span className="text-slate-500 block flex items-center"><Droplets className="w-3 h-3 mr-0.5 text-sky-400" /> HUMIDITY</span>
                <span className="text-slate-100 font-bold">{latestData.normalized.humidity_percent}%</span>
              </div>
              <div>
                <span className="text-slate-500 block flex items-center"><Wind className="w-3 h-3 mr-0.5 text-amber-400" /> AQI</span>
                <span className="text-amber-400 font-bold">{latestData.normalized.aqi} ({latestData.normalized.aqi_status})</span>
              </div>
              <div>
                <span className="text-slate-500 block flex items-center"><Eye className="w-3 h-3 mr-0.5 text-purple-400" /> UV INDEX</span>
                <span className="text-purple-400 font-bold">{latestData.normalized.uv_index} ({latestData.normalized.uv_status})</span>
              </div>
            </div>

            {/* Health Risk Scores */}
            <div className="space-y-1 text-[10px]">
              <div className="flex items-center justify-between text-slate-400">
                <span>DETERMINISTIC RISKS:</span>
                <span className="text-slate-500 font-sans">{latestData.providerName}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="bg-slate-900 p-1.5 rounded border border-slate-800 flex justify-between">
                  <span>Heat Risk:</span>
                  <span className="font-bold text-red-400 uppercase">{latestData.riskAssessment.heat_risk}</span>
                </div>
                <div className="bg-slate-900 p-1.5 rounded border border-slate-800 flex justify-between">
                  <span>Air Quality Risk:</span>
                  <span className="font-bold text-amber-400 uppercase">{latestData.riskAssessment.air_quality_risk}</span>
                </div>
                <div className="bg-slate-900 p-1.5 rounded border border-slate-800 flex justify-between">
                  <span>Dehydration Risk:</span>
                  <span className="font-bold text-sky-400 uppercase">{latestData.riskAssessment.dehydration_risk}</span>
                </div>
                <div className="bg-slate-900 p-1.5 rounded border border-slate-800 flex justify-between">
                  <span>Overall Climate Risk:</span>
                  <span className="font-bold text-purple-400 uppercase">{latestData.riskAssessment.overall_climate_risk}</span>
                </div>
              </div>
            </div>

            {/* Hydration Engine Calculation */}
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 space-y-1 text-[10px] font-sans">
              <div className="font-bold text-sky-300 flex items-center justify-between">
                <span>💧 DETERMINISTIC HYDRATION TARGET:</span>
                <span className="font-mono text-xs">{latestData.hydration.recommended_target_liters} Liters ({latestData.hydration.recommended_target_ml}ml)</span>
              </div>
              <p className="text-slate-400 text-[10px]">{latestData.hydration.reason}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
