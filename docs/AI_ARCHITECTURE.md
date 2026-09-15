# Dayli.ai AI Orchestration Architecture & Safety Specs

## 1. Overview
The **Dayli.ai Climate Health Copilot** AI Orchestration Architecture combines natural-language processing via OpenAI with strict **Deterministic Clinical Safety Rules** to protect pregnant women and mothers during extreme climate events (heatwaves, high AQI, UV exposure).

---

## 2. System Architecture

```
User Message (WhatsApp / Simulator)
       ↓
Session & Context Builder (Minimal Safe Payload)
       ↓
AI Orchestrator
       ↓
Intent Router (Structured JSON / Keyword Fallback)
  ├── General Care Agent (Heat, Hydration, AQI, UV)
  ├── Clinical Triage Agent (Symptom Extraction & Normalization)
  ├── Medication Adherence Agent (Heat Storage, Supplements, Reminders)
  └── Emergency Pathway (Immediate Red-Flag Escalation)
       ↓
Deterministic Clinical Safety Layer (Risk Thresholds & Emergency Escalation)
       ↓
Response Generator (WhatsApp Markdown & Action Recommendations)
       ↓
Chat UI & Referral Ticket Generation (If High Risk)
```

---

## 3. Critical Safety Guarantees

> [!IMPORTANT]
> **LLMs CANNOT independently make clinical referral decisions.**
> - **OpenAI Role**: Intent classification, symptom extraction, natural language translation, actionable health education, and empathetic framing.
> - **Deterministic Safety Layer Role**: Risk scoring (`Low`, `Moderate`, `High / Emergency`), red-flag keyword evaluation (fainting, reduced fetal kicks, high fever >102°F, severe bleeding, heat stroke), required fields, emergency escalation, and ticket generation.
> - **Zero Downgrade Rule**: An LLM output can **never** downgrade a high-risk emergency flagged by deterministic safety rules.

---

## 4. Components & File Map

| Component | File Path | Responsibilities |
|---|---|---|
| **Config Reader** | `src/services/ai/config.ts` | Reads environment variables (`OPENAI_API_KEY`, `OPENAI_MODEL`), masks credentials, and performs health checks. |
| **OpenAI Client** | `src/services/ai/client.ts` | Client HTTP wrapper with 30s timeout handling (`AbortController`), exponential backoff retries, and zero credential logging. |
| **Prompts Registry** | `src/services/ai/prompts/index.ts` | Versioned system prompts (`v1.0.0`) for Intent Router, Agents, and Generator. |
| **Context Builder** | `src/services/ai/contextBuilder.ts` | Assembles lean prompt context (`user_profile`, `location`, `weather`, `aqi`, `uv_index`, `hydration_target`). |
| **Intent Router** | `src/services/ai/intentRouter.ts` | Classifies intent into `general_care`, `clinical_triage`, `medication_adherence`, `weather_climate`, `emergency`, `unknown`. |
| **General Care Agent** | `src/services/ai/agents/generalCareAgent.ts` | Generates climate protection and hydration guidance based on local heat index. |
| **Clinical Triage Agent** | `src/services/ai/agents/clinicalTriageAgent.ts` | Extracts symptoms and produces structured triage assessment JSON objects. |
| **Medication Agent** | `src/services/ai/agents/medicationAdherenceAgent.ts` | Advises on pill storage under heat; instructs users to consult clinicians for custom dosages. |
| **Safety Layer** | `src/services/ai/safetyLayer.ts` | Evaluates risk levels, enforces red-flag escalation, and triggers emergency referral ticket creation. |
| **Response Generator** | `src/services/ai/responseGenerator.ts` | Formats final WhatsApp Markdown output with actionable steps and referral details. |
| **AI Orchestrator** | `src/services/ai/aiOrchestrator.ts` | Central manager coordinating end-to-end processing pipeline and metadata generation. |
| **AI Logger** | `src/services/ai/aiLogger.ts` | Structured non-sensitive logging (request ID, timestamp, intent, latency, tokens, risk level). |
| **Developer Console** | `src/components/devconsole/OpenAITab.tsx` | UI tab displaying health check status, model selection, prompt testing, and masked key notice. |

---

## 5. Environment Variables & Setup

Create a `.env` file in the root directory:

```bash
# OpenAI Integration Settings
OPENAI_API_KEY=sk-proj-your_api_key_here
VITE_OPENAI_API_KEY=sk-proj-your_api_key_here

# Model Selection
OPENAI_MODEL=gpt-4o-mini
VITE_OPENAI_MODEL=gpt-4o-mini

# Timeout (ms)
OPENAI_TIMEOUT_MS=30000
VITE_OPENAI_TIMEOUT_MS=30000
```

### Local Development Commands
```bash
# Start local development server
npm run dev

# Run full production build
npm run build

# Run automated AI Orchestration test suite
npm run test
```

---

## 6. API & Response Schema

### `AIOrchestrationMetadata`
```typescript
{
  intent: "general_care" | "clinical_triage" | "medication_adherence" | "weather_climate" | "emergency" | "unknown",
  riskLevel: "Low" | "Moderate" | "High / Emergency",
  requiresReferral: boolean,
  response: string,
  actions: string[],
  sources: string[],
  confidence: number,
  latencyMs: number,
  tokensUsed: number,
  modelUsed: string,
  fallbackUsed: boolean,
  promptVersion: string,
  referralTicket?: ReferralTicket
}
```
