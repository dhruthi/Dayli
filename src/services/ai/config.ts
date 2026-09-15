import { OpenAIHealthCheckResult } from '../../types/services';

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  timeoutMs: number;
  source: 'env' | 'local' | 'none';
  provider: 'openai';
}

function getEnvVar(key: string): string | undefined {
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv[key]) return metaEnv[key];
  } catch (e) {}

  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {}

  return undefined;
}

export function getOpenAIConfig(overrideKey?: string, overrideModel?: string): OpenAIConfig {
  let apiKey = (overrideKey || '').trim();
  let source: 'env' | 'local' | 'none' = 'none';

  if (apiKey) {
    source = 'local';
  }

  // Check localStorage if browser environment
  if (!apiKey && typeof window !== 'undefined') {
    const localKey = localStorage.getItem('dayli_openai_api_key');
    if (localKey && localKey.trim()) {
      apiKey = localKey.trim();
      source = 'local';
    }
  }

  // Static reference for Vite bundling replacement
  if (!apiKey) {
    try {
      const viteKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (viteKey && viteKey.trim()) {
        apiKey = viteKey.trim();
        source = 'env';
      }
    } catch (e) {}
  }

  if (!apiKey) {
    const envKey = getEnvVar('VITE_OPENAI_API_KEY') || getEnvVar('OPENAI_API_KEY');
    if (envKey && envKey.trim()) {
      apiKey = envKey.trim();
      source = 'env';
    }
  }

  // No hardcoded fallback key. Vite inlines every literal in this file into
  // the browser bundle, so a default key here is published to every visitor
  // of the built site. An unconfigured key must stay empty and surface as
  // "not configured" through checkOpenAIHealthStatus().
  const provider = 'openai' as const;

  // Model Selection
  let model = (overrideModel || '').trim();
  if (!model && typeof window !== 'undefined') {
    const localModel = localStorage.getItem('dayli_openai_model');
    if (localModel && localModel.trim()) {
      model = localModel.trim();
    }
  }

  if (!model) {
    const envModel = getEnvVar('VITE_OPENAI_MODEL') || getEnvVar('OPENAI_MODEL');
    model = envModel || 'gpt-4o-mini';
  }

  // Timeout Selection
  let timeoutMs = 30000;
  const envTimeout = getEnvVar('VITE_OPENAI_TIMEOUT_MS') || getEnvVar('OPENAI_TIMEOUT_MS');
  if (envTimeout) {
    const parsed = parseInt(String(envTimeout), 10);
    if (!isNaN(parsed) && parsed > 0) {
      timeoutMs = parsed;
    }
  }

  return {
    apiKey,
    model,
    timeoutMs,
    source,
    provider,
  };
}

export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) return '****';
  const prefix = apiKey.substring(0, 7); // e.g. "sk-proj"
  const suffix = apiKey.substring(apiKey.length - 4);
  return `${prefix}...${suffix}`;
}

export function checkOpenAIHealthStatus(overrideKey?: string, overrideModel?: string): OpenAIHealthCheckResult {
  const config = getOpenAIConfig(overrideKey, overrideModel);

  if (!config.apiKey) {
    return {
      isConfigured: false,
      source: 'none',
      selectedModel: config.model,
      status: 'error',
      message: 'No API Key configured in .env or local storage.',
    };
  }

  const isValidKey = config.apiKey.startsWith('sk-');
  if (!isValidKey) {
    return {
      isConfigured: false,
      source: config.source,
      selectedModel: config.model,
      maskedKey: maskApiKey(config.apiKey),
      status: 'error',
      message: 'Invalid API key format (must start with sk-).',
    };
  }

  return {
    isConfigured: true,
    source: config.source,
    selectedModel: config.model,
    maskedKey: maskApiKey(config.apiKey),
    status: 'ok',
    message: `${config.provider.toUpperCase()} AI Engine active (${maskApiKey(config.apiKey)}), model: ${config.model}.`,
  };
}
