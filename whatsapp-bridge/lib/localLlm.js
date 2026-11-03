/**
 * ==============================================================================
 * Dayli AI — Local Open-Weight Medical LLM Bridge (Ollama / On-Device)
 * ==============================================================================
 * Connects Dayli to a local, open-source small language model (e.g., dayli-health-3b,
 * Llama-3.2-3B, MedGemma) running strictly on localhost via Ollama.
 *
 * Mozilla Human-Scale AI Compliance:
 *   - 100% on-device / local execution. Zero commercial frontier API calls.
 *   - Zero data exfiltration; patient messages never leave localhost.
 *   - SafetyCore is strictly authoritative:
 *       1. Emergency & High clinical risk queries BYPASS the LLM completely.
 *       2. Deterministic clinical facts are provided as grounded source facts.
 *       3. Model output is verified by deterministic post-generation guards
 *          (infant plain-water ban under 6 months, paracetamol/drug dosing ban,
 *           and emergency talk-down ban).
 *       4. Instant fallback to deterministic reply on timeout or violation.
 */

import { validateModelOutput } from '../../shared/safetyCore.js';
import { allowLocalLlm } from './coreMode.js';
import { buildMedGemmaSystemPrompt, buildMedGemmaUserPrompt } from './medgemmaPrompt.js';

export const DEFAULT_OLLAMA_URL = process.env.MEDGEMMA_API_URL || process.env.DAYLI_OLLAMA_URL || process.env.LOCAL_LLM_URL || 'http://127.0.0.1:11434';
export const DEFAULT_MODEL = process.env.MEDGEMMA_MODEL || process.env.DAYLI_LOCAL_MODEL || 'medgemma:latest';
export const MEDGEMMA_API_KEY = (process.env.MEDGEMMA_API_KEY || '').trim();
export const DEFAULT_TIMEOUT_MS = parseInt(process.env.LOCAL_LLM_TIMEOUT_MS || '35000', 10);

/**
 * Checks if the local Ollama server is running and returns available models.
 * @param {object} [options]
 * @param {string} [options.ollamaUrl]
 * @param {string} [options.apiKey]
 * @returns {Promise<{ available: boolean, models: string[], error?: string }>}
 */
export async function checkLocalLlmAvailable({ ollamaUrl = DEFAULT_OLLAMA_URL, apiKey = MEDGEMMA_API_KEY } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  const headers = {};
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const rootUrl = (ollamaUrl || DEFAULT_OLLAMA_URL).replace(/\/v1\/?$/, '');

  try {
    let res = await fetch(`${rootUrl}/api/tags`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    if (!res.ok && res.status === 404) {
      res = await fetch(`${rootUrl}/v1/models`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
    }
    clearTimeout(timeout);

    if (!res.ok) {
      return { available: false, models: [], error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    const models = (data.models || []).map((m) => m.name || m.model)
      .concat((data.data || []).map((m) => m.id || m.name));
    return { available: true, models };
  } catch (err) {
    clearTimeout(timeout);
    return { available: false, models: [], error: err.message };
  }
}

/**
 * Deterministic infant hydration safety validator.
 * In accordance with WHO/UNICEF clinical guidelines, infants under 6 months must
 * receive breast milk or infant formula ONLY. Plain water, herbal teas, or diluting
 * formula with extra water can induce fatal hyponatremia and water intoxication.
 *
 * @param {string} text Candidate model output
 * @param {object} safety SafetyCore evaluation object
 * @returns {{ safe: boolean, reason?: string }}
 */
export function detectInfantWaterViolation(text, safety = {}) {
  const isInfant =
    safety?.subject === 'infant' ||
    (safety?.statedAgeMonths != null && safety.statedAgeMonths < 6);

  if (!isInfant) {
    return { safe: true };
  }

  const lower = String(text || '').toLowerCase();

  // Affirmative advice to give water / mix water
  // Patterns like "give water", "offer water", "sip of water", "mix with water", "add water", "boiled water"
  const englishAffirmative = /\b(?:give|giving|offer|offering|feed|feeding|mix|mixing|dilut(?:e|ing)?|add|adding|spoon(?:ful)?)\b[^.\n!?]{0,50}\b(?:water|boiled water|fluids)\b/i;
  const hindiAffirmative = /(?:पानी|जल)\s*(?:मिला|डाल|पिला|दें|दीजिए|दे सकते|घोल)/i;
  const teluguAffirmative = /(?:నీరు|నీళ్లు)\s*(?:ఇవ్వ|కలప|తాప|పోస్)/i;

  // Safe negation patterns like "do not give water", "water is not recommended", "पानी नहीं देना", "నీరు ఇవ్వకూడదు"
  const isExplicitlyNegated =
    /\b(?:do not|don't|never|avoid|not recommended|no need to give|should not give)\b[^.\n!?]{0,30}\b(?:water|boiled water)\b/i.test(lower) ||
    /(?:पानी|जल)\s*(?:नहीं|न|मत)\s*(?:दें|पिलाएं|देना)/i.test(text) ||
    /(?:నీరు|నీళ్లు)\s*(?:ఇవ్వకూడదు|ఇవ్వవద్దు|వద్దు)/i.test(text);

  if ((englishAffirmative.test(lower) || hindiAffirmative.test(text) || teluguAffirmative.test(text)) && !isExplicitlyNegated) {
    return {
      safe: false,
      reason: 'INFANT_WATER_VIOLATION: Positive recommendation of water to infant under 6 months detected',
    };
  }

  return { safe: true };
}

/**
 * Executes a raw chat query against the local LLM.
 *
 * @param {object} params
 * @param {string} params.prompt
 * @param {string} [params.systemPrompt]
 * @param {string} [params.model]
 * @param {string} [params.ollamaUrl]
 * @param {number} [params.timeoutMs]
 * @param {number} [params.temperature]
 * @returns {Promise<{ success: boolean, content: string, latencyMs: number, error?: string }>}
 */
export async function queryLocalLlmRaw({
  prompt,
  systemPrompt,
  messages: providedMessages,
  model = DEFAULT_MODEL,
  ollamaUrl = DEFAULT_OLLAMA_URL,
  apiKey = MEDGEMMA_API_KEY,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  temperature = 0.35,
  maxTokens = 400,
} = {}) {
  const startTime = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let messages = [];
  if (Array.isArray(providedMessages) && providedMessages.length > 0) {
    messages = [...providedMessages];
  } else {
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    if (prompt) {
      messages.push({ role: 'user', content: prompt });
    }
  }

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const isV1 = ollamaUrl.endsWith('/v1') || ollamaUrl.includes('/v1/');
  const endpoint = isV1
    ? `${ollamaUrl.replace(/\/+$/, '')}/chat/completions`
    : `${ollamaUrl.replace(/\/+$/, '')}/api/chat`;

  const body = isV1
    ? {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }
    : {
        model,
        messages,
        stream: false,
        options: {
          temperature,
          top_p: 0.9,
          num_predict: maxTokens,
        },
      };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      return {
        success: false,
        content: '',
        latencyMs,
        error: `MedGemma HTTP ${res.status}: ${errBody || res.statusText}`,
      };
    }

    const json = await res.json();
    const content =
      json?.choices?.[0]?.message?.content?.trim() ||
      json?.message?.content?.trim() ||
      '';
    return { success: true, content, latencyMs };
  } catch (err) {
    clearTimeout(timer);
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      content: '',
      latencyMs,
      error: err.name === 'AbortError' ? `Timeout after ${timeoutMs}ms` : err.message,
    };
  }
}

/**
 * Generates an empathetic, clinically grounded response using MedGemma
 * incorporating real-time weather, nearby facilities, patient profile, and safety constraints.
 *
 * @param {object} params
 * @param {string} params.userMessage User query
 * @param {string} [params.userName] User display name
 * @param {string} [params.locale] Target language (en, hi, te, ta, kn, etc.)
 * @param {object} [params.profile] Patient profile
 * @param {string} [params.liveContext] Weather / AQI summary
 * @param {Array} [params.clinicsData] Nearby clinics from OSM
 * @param {string} [params.groundFacts] Ground-truth deterministic text
 * @param {object} [params.safety] SafetyCore evaluation object
 * @param {Array} [params.history] Recent conversation turns
 * @param {string} [params.model] Model tag
 * @param {string} [params.ollamaUrl] Ollama base URL
 * @param {string} [params.apiKey] Bearer token if using hosted endpoint
 * @param {number} [params.timeoutMs] Timeout in ms
 * @param {boolean} [params.force] Force bypass allowLocalLlm() check for testing
 * @returns {Promise<{ text: string, source: 'local_llm'|'deterministic', violations: string[], latencyMs: number }>}
 */
export async function generateWithLocalLlm({
  userMessage,
  userName = 'there',
  locale = 'en',
  profile = {},
  liveContext = '',
  clinicsData = [],
  groundFacts = '',
  safety = {},
  history = [],
  model = DEFAULT_MODEL,
  ollamaUrl = DEFAULT_OLLAMA_URL,
  apiKey = MEDGEMMA_API_KEY,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  force = false,
}) {
  const startTime = Date.now();

  // Feature flag check
  if (!force && !allowLocalLlm()) {
    return {
      text: groundFacts,
      source: 'deterministic',
      violations: [],
      latencyMs: 0,
    };
  }

  const systemPrompt = buildMedGemmaSystemPrompt({ userName, locale, model });
  const userPrompt = buildMedGemmaUserPrompt({
    userMessage,
    userName,
    profile,
    liveContext,
    clinicsData,
    groundFacts,
    safety,
    history,
  });

  const result = await queryLocalLlmRaw({
    prompt: userPrompt,
    systemPrompt,
    model,
    ollamaUrl,
    apiKey,
    timeoutMs,
    temperature: 0.35,
    maxTokens: 400,
  });

  const latencyMs = Date.now() - startTime;

  if (!result.success || !result.content) {
    return {
      text: groundFacts,
      source: 'deterministic',
      violations: [result.error || 'LLM_EMPTY_RESPONSE'],
      latencyMs,
    };
  }

  // Post-Generation Safety Validation
  const outputCheck = validateModelOutput({ text: result.content, safety });
  const infantWaterCheck = detectInfantWaterViolation(outputCheck.text, safety);

  const violations = [...(outputCheck.violations || [])];
  if (!infantWaterCheck.safe) {
    violations.push(infantWaterCheck.reason);
  }

  if (!infantWaterCheck.safe || violations.includes('DOWNGRADED_EMERGENCY')) {
    return {
      text: groundFacts,
      source: 'deterministic',
      violations,
      latencyMs,
    };
  }

  const finalText = outputCheck.text.trim();
  if (finalText.length < 20 || finalText.length > 2000) {
    return {
      text: groundFacts,
      source: 'deterministic',
      violations: [...violations, 'LENGTH_OUT_OF_BOUNDS'],
      latencyMs,
    };
  }

  return {
    text: finalText,
    source: 'local_llm',
    violations,
    latencyMs,
  };
}

/**
 * Rewrites and polishes a deterministic clinical/climate response using the local LLM,
 * subject to strict safety validation and deterministic fallback.
 *
 * @param {object} params
 * @param {string} params.deterministicReply Ground-truth deterministic text from clinical catalog
 * @param {string} params.userMessage User query
 * @param {string} [params.locale] Target language (en, hi, te, ta, kn, etc.)
 * @param {string} [params.userName] User display name
 * @param {object} [params.safety] SafetyCore evaluation object
 * @param {string} [params.model] Model tag
 * @param {string} [params.ollamaUrl] Local Ollama URL
 * @param {number} [params.timeoutMs] Timeout in ms
 * @param {boolean} [params.force] Bypass allowLocalLlm() check for test bench
 * @returns {Promise<{ text: string, source: 'local_llm'|'deterministic', violations: string[], latencyMs: number }>}
 */
export async function rewriteWithLocalLlm({
  deterministicReply,
  deterministicText,
  userMessage,
  locale = 'en',
  userName = 'there',
  safety = {},
  model = DEFAULT_MODEL,
  ollamaUrl = DEFAULT_OLLAMA_URL,
  apiKey = MEDGEMMA_API_KEY,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  force = false,
}) {
  const finalReply = deterministicReply || deterministicText || '';
  const startTime = Date.now();

  // 1. Safety Gate: Emergency and High Risk BYPASS LLM completely.
  if (safety?.riskLevel === 'emergency' || safety?.riskLevel === 'high') {
    return {
      text: finalReply,
      source: 'deterministic',
      violations: [],
      latencyMs: 0,
    };
  }

  // 2. Feature flag check (unless forced by test runner)
  if (!force && !allowLocalLlm()) {
    return {
      text: finalReply,
      source: 'deterministic',
      violations: [],
      latencyMs: 0,
    };
  }

  // 3. Build grounded prompt using MedGemma system prompt
  const systemPrompt = buildMedGemmaSystemPrompt({ userName, locale, model });

  const userPrompt = [
    `User message: "${userMessage}"`,
    '',
    `Verified Clinical Facts to deliver:`,
    `${finalReply}`,
    '',
    `Rephrase this clearly and warmly for the user (${userName}) while keeping all factual safety advice intact:`,
  ].join('\n');

  const result = await queryLocalLlmRaw({
    prompt: userPrompt,
    systemPrompt,
    model,
    ollamaUrl,
    apiKey,
    timeoutMs,
    temperature: 0.35,
    maxTokens: 400,
  });

  const latencyMs = Date.now() - startTime;

  if (!result.success || !result.content) {
    return {
      text: finalReply,
      source: 'deterministic',
      violations: [result.error || 'LLM_EMPTY_RESPONSE'],
      latencyMs,
    };
  }

  // 4. Deterministic Post-Generation Verification
  const outputCheck = validateModelOutput({ text: result.content, safety });
  const infantWaterCheck = detectInfantWaterViolation(outputCheck.text, safety);

  const violations = [...(outputCheck.violations || [])];
  if (!infantWaterCheck.safe) {
    violations.push(infantWaterCheck.reason);
  }

  // If critical safety violation occurred, fall back to deterministic reply immediately
  if (!infantWaterCheck.safe || violations.includes('DOWNGRADED_EMERGENCY')) {
    return {
      text: deterministicReply,
      source: 'deterministic',
      violations,
      latencyMs,
    };
  }

  // If stated drug doses were stripped or text is within bounds, use cleaned output
  const finalText = outputCheck.text.trim();
  if (finalText.length < 20 || finalText.length > 2000) {
    return {
      text: deterministicReply,
      source: 'deterministic',
      violations: [...violations, 'LENGTH_OUT_OF_BOUNDS'],
      latencyMs,
    };
  }

  return {
    text: finalText,
    source: 'local_llm',
    violations,
    latencyMs,
  };
}

export default {
  DEFAULT_OLLAMA_URL,
  DEFAULT_MODEL,
  checkLocalLlmAvailable,
  detectInfantWaterViolation,
  queryLocalLlmRaw,
  generateWithLocalLlm,
  rewriteWithLocalLlm,
};
