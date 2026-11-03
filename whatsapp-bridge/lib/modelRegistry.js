/**
 * ==============================================================================
 * Dayli AI — Clinical Model Registry & Dynamic Multi-Model Switcher
 * ==============================================================================
 * Enables seamless switching and comparison between open-weight clinical LLMs:
 *   1. Google MedGemma (4.3B / 2.7B) — maternal, pediatric, heat health
 *   2. BioMistral (7B) — PubMed biomedical literature, diagnostics & adult clinical triage
 *   3. Baichuan-M (Medical Multilingual) — high-fidelity Indic & cross-lingual consultation
 *   4. Dayli Health (3B LoRA) — lightweight edge clinical model for Indian PHC protocols
 *
 * Models can be switched:
 *   - Directly via WhatsApp chat commands: `#model biomistral`, `/model baichuan`, `#model medgemma`
 *   - Globally via environment variables: DAYLI_LOCAL_MODEL / MEDGEMMA_MODEL
 *   - Programmatically per user session
 */

export const CLINICAL_MODELS = {
  medgemma: {
    id: 'medgemma',
    name: 'Google MedGemma',
    label: 'Google MedGemma (4B Clinical)',
    tag: 'medgemma:latest',
    aliases: ['medgemma', 'gemma', 'med-gemma', 'medgemma:latest', 'medgemma4b', 'medgemma2b'],
    description: 'Specialized for maternal & pediatric health, heat resilience, and hydration triage.',
    systemHeader: 'You are dayli (powered by MedGemma) — a caring, warm, and knowledgeable health companion on WhatsApp for women, mothers, infants, and children across India.',
    badge: '🌸 Maternal & Pediatric',
  },
  biomistral: {
    id: 'biomistral',
    name: 'BioMistral',
    label: 'BioMistral (7B Biomedical)',
    tag: 'biomistral:latest',
    aliases: ['biomistral', 'biomistral:latest', 'biomistral:7b', 'bio-mistral', 'cniongolo/biomistral', 'biomistral7b'],
    description: 'Specialized in PubMed biomedical knowledge, pharmacology, and adult clinical triage.',
    systemHeader: 'You are dayli (powered by BioMistral) — a caring, scientifically grounded clinical health copilot on WhatsApp for families across India.',
    badge: '🔬 Biomedical & Diagnostics',
  },
  baichuan: {
    id: 'baichuan',
    name: 'Baichuan-M',
    label: 'Baichuan-M (Medical Multilingual)',
    tag: 'baichuan-m:latest',
    aliases: ['baichuan', 'baichuan-m', 'baichuan-m:latest', 'baichuan2', 'baichuan2:7b', 'baichuan:latest', 'baichuanm'],
    description: 'Specialized in multilingual Indic health consultations and cross-lingual clinical nuances.',
    systemHeader: 'You are dayli (powered by Baichuan-M) — an empathetic multilingual health copilot on WhatsApp for Indian families.',
    badge: '🌏 Multilingual Clinical',
  },
  'dayli-health': {
    id: 'dayli-health',
    name: 'Dayli Health LoRA',
    label: 'Dayli Health (3B LoRA)',
    tag: 'dayli-health-3b:latest',
    aliases: ['dayli-health', 'dayli-health-3b', 'dayli-health:latest', 'dayli-health-3b:latest', 'dayli'],
    description: 'Fine-tuned lightweight model aligned with Indian PHC clinical protocols.',
    systemHeader: 'You are dayli — a warm, community-first health companion specialized in Indian PHC clinical protocols.',
    badge: '⚡ Lightweight Edge',
  },
};

export const DEFAULT_MODEL_ID = 'medgemma';

/**
 * Finds a model by ID or alias (case-insensitive, trimming punctuation).
 * @param {string} query
 * @returns {object|null}
 */
export function findModel(query = '') {
  if (!query || typeof query !== 'string') return null;
  const clean = query
    .trim()
    .toLowerCase()
    .replace(/^(?:[#/!]\s*)?(?:model\s+)?/, '')
    .trim();

  for (const model of Object.values(CLINICAL_MODELS)) {
    if (model.id === clean || model.tag.toLowerCase() === clean) {
      return model;
    }
    if (model.aliases.some((alias) => alias.toLowerCase() === clean)) {
      return model;
    }
  }
  return null;
}

/**
 * Returns all registered clinical models as an array.
 * @returns {Array<object>}
 */
export function getAllModels() {
  return Object.values(CLINICAL_MODELS);
}

/**
 * Resolves the active model configuration for a session or environment.
 *
 * @param {object} [params]
 * @param {object} [params.session] User session containing profile.activeModel
 * @param {string} [params.envModel] Model tag from environment
 * @returns {object} Full model metadata object
 */
export function resolveActiveModel({ session, envModel } = {}) {
  // 1. Session preference
  if (session?.profile?.activeModelId && CLINICAL_MODELS[session.profile.activeModelId]) {
    return CLINICAL_MODELS[session.profile.activeModelId];
  }
  if (session?.profile?.activeModel) {
    const found = findModel(session.profile.activeModel);
    if (found) return found;
  }

  // 2. Environment variable
  const rawEnv = envModel || process.env.DAYLI_LOCAL_MODEL || process.env.MEDGEMMA_MODEL;
  if (rawEnv) {
    const found = findModel(rawEnv);
    if (found) return found;
  }

  // 3. Default fallback
  return CLINICAL_MODELS[DEFAULT_MODEL_ID];
}

/**
 * Formats a clean WhatsApp interactive model switcher menu.
 *
 * @param {string} activeModelId Currently active model ID
 * @returns {string} Formatted WhatsApp message
 */
export function formatModelMenu(activeModelId = DEFAULT_MODEL_ID) {
  const current = CLINICAL_MODELS[activeModelId] || CLINICAL_MODELS[DEFAULT_MODEL_ID];

  return `🤖 *Dayli AI — Medical LLM Selector*

Currently Active:
👉 *${current.label}*
   Tag: \`${current.tag}\`
   ${current.badge} — ${current.description}

─────────────────────────
*Available Clinical Models:*

1️⃣ *Google MedGemma*
   Command: \`#model medgemma\`
   🌸 Maternal & infant care, dehydration triage

2️⃣ *BioMistral*
   Command: \`#model biomistral\`
   🔬 PubMed biomedical reasoning, adult diagnostics

3️⃣ *Baichuan-M*
   Command: \`#model baichuan\`
   🌏 Multilingual Indic clinical consultation

4️⃣ *Dayli-Health LoRA*
   Command: \`#model dayli-health\`
   ⚡ High-speed local PHC protocols

─────────────────────────
💬 *To switch model:*
Reply with \`#model biomistral\` or \`#model baichuan\`.
To check active model anytime, simply reply \`#model\`.`;
}

/**
 * Detects whether an incoming text message is a model switcher command.
 * Matches:
 *   #model, /model, !model, MODEL, models, which model, switch model
 *   #model biomistral, /model baichuan, #model medgemma
 *
 * @param {string} text Incoming user message
 * @returns {{ isCommand: boolean, action: 'status'|'switch', modelQuery?: string }}
 */
export function parseModelCommand(text = '') {
  if (!text || typeof text !== 'string') return { isCommand: false };
  const raw = text.trim();
  const lower = raw.toLowerCase();

  // Pattern: #model <name>, /model <name>, !model <name>, model <name>
  const match = lower.match(/^(?:[#/!]\s*)?model(?:s)?(?:\s+(.+))?$/i);
  if (match) {
    const arg = match[1]?.trim();
    if (!arg || arg === 'status' || arg === 'list' || arg === 'help') {
      return { isCommand: true, action: 'status' };
    }
    return { isCommand: true, action: 'switch', modelQuery: arg };
  }

  // Natural language variants: "switch to biomistral", "switch model to baichuan", "use medgemma"
  const nlMatch = lower.match(/^(?:switch\s+(?:model\s+)?to|use\s+model|use)\s+([a-z0-9_-]+)$/i);
  if (nlMatch) {
    const target = nlMatch[1].trim();
    if (findModel(target)) {
      return { isCommand: true, action: 'switch', modelQuery: target };
    }
  }

  if (lower === 'which model' || lower === 'current model' || lower === 'what model') {
    return { isCommand: true, action: 'status' };
  }

  return { isCommand: false };
}

/**
 * Executes a model command, updating the session if switching.
 *
 * @param {string} text Incoming message
 * @param {object} session User session object
 * @returns {{ handled: boolean, reply: string, switchedModel?: object }}
 */
export function handleModelCommand(text, session = {}) {
  const parsed = parseModelCommand(text);
  if (!parsed.isCommand) {
    return { handled: false, reply: '' };
  }

  const activeModel = resolveActiveModel({ session });

  if (parsed.action === 'status') {
    return {
      handled: true,
      reply: formatModelMenu(activeModel.id),
    };
  }

  if (parsed.action === 'switch' && parsed.modelQuery) {
    const target = findModel(parsed.modelQuery);
    if (!target) {
      return {
        handled: true,
        reply: `⚠️ *Unknown Model "${parsed.modelQuery}"*\n\nAvailable models are:\n• *medgemma* (Google MedGemma)\n• *biomistral* (BioMistral 7B)\n• *baichuan* (Baichuan-M)\n• *dayli-health* (Dayli 3B LoRA)\n\nReply with \`#model biomistral\` or \`#model medgemma\` to switch.`,
      };
    }

    // Apply model to session
    if (!session.profile) session.profile = {};
    session.profile.activeModel = target.tag;
    session.profile.activeModelId = target.id;
    session.profile.activeModelName = target.name;

    const reply = `✅ *Active Model Switched!*

🤖 Now using: *${target.label}*
🏷️ Model Tag: \`${target.tag}\`
${target.badge}

${target.description}

All subsequent health and symptom questions in this chat will now be processed by *${target.name}*.

_Tip: Reply \`#model medgemma\` to switch back at any time._`;

    return {
      handled: true,
      reply,
      switchedModel: target,
    };
  }

  return { handled: false, reply: '' };
}
