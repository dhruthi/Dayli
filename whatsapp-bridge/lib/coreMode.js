/**
 * ==============================================================================
 * Dayli AI — Core Execution Mode Configuration (Mozilla Human-Scale AI)
 * ==============================================================================
 * Controls whether Dayli operates in:
 *   - 'local'  : Fully offline / zero frontier-model API dependence.
 *                All routing, urgency prioritization, and clinical/climate
 *                advisories run via the purpose-built local router and verified
 *                deterministic clinical composers.
 *   - 'hybrid' : Local router makes authoritative routing & triage decisions,
 *                with optional small LLM text polishing if configured.
 *   - 'llm'    : Legacy mode (fallback to external API if available).
 *
 * Default in production is 'local' to ensure complete data sovereignty and
 * zero dependence on closed commercial frontier model APIs.
 */

export function getCoreMode() {
  if (process.env.DAYLI_CORE_MODE) {
    return process.env.DAYLI_CORE_MODE.toLowerCase().trim();
  }
  const hasFrontierKey = Boolean(
    process.env.OPENAI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.GROK_API_KEY ||
    process.env.XAI_API_KEY
  );
  return hasFrontierKey ? 'hybrid' : 'local';
}

export const CORE_MODE = getCoreMode();

/**
 * Returns true if external commercial frontier model APIs (OpenAI, Groq, Gemini)
 * are allowed to be called. In 'local' mode this is strictly false.
 * @returns {boolean}
 */
export function allowFrontier() {
  return getCoreMode() !== 'local';
}

/**
 * Returns true if the system is running in pure local Human-Scale AI mode.
 * @returns {boolean}
 */
export function isLocalOnly() {
  return getCoreMode() === 'local';
}

/**
 * Returns true if local open-weight LLM testing (e.g. Ollama dayli-health-3b / Llama-3.2)
 * is explicitly enabled. Operates 100% on localhost with zero frontier API calls.
 * @returns {boolean}
 */
export function allowLocalLlm() {
  return process.env.DAYLI_LOCAL_LLM === 'on' || process.env.DAYLI_LOCAL_LLM === 'true';
}

export function getCoreModeInfo() {
  const mode = getCoreMode();
  return {
    mode,
    frontierAllowed: allowFrontier(),
    localOnly: isLocalOnly(),
    localLlmAllowed: allowLocalLlm(),
    version: '1.0.0-human-scale',
    description: isLocalOnly()
      ? 'Dayli Human-Scale AI Core: 100% local in-process multilingual routing & clinical triage'
      : `Dayli Hybrid Mode: Frontier API allowed (${mode})`,
  };
}
