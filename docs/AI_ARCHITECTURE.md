# dayli.ai AI Orchestration Architecture

## 1. Overview
The **dayli.ai Climate Health Copilot** generates WhatsApp replies with an
OpenAI-compatible language model, wrapped on both sides by deterministic code:
context is assembled and safety-evaluated *before* the model runs, and the
model's output is validated and composed *after*. The model never has the last
word.

---

## 2. Pipeline

```
Inbound message (whatsapp-bridge/server.js → generateAIResponse)
       ↓
Context assembly
  ├── GPS pin  ──► Open-Meteo climate + OpenStreetMap clinics
  ├── Named city / climate keyword ──► geocode ──► climate (+ clinics on request)
  └── Nothing known ──► explicit "CLIMATE DATA UNAVAILABLE" instruction
       ↓
Deterministic safety evaluation (shared/safetyCore.js)
  → subject · riskLevel · reasonCodes · non-negotiable constraints
       ↓
Prompt = system prompt + conversation history (last 5 turns, keyed by sender id)
         + data context + safety constraints
       ↓
Primary provider ──► OpenAI-compatible chat completions
       │  (no reply)
       ▼
Fallback provider ──► Google Gemini
       │  (no reply)
       ▼
Deterministic fallback — an emergency is still an emergency with no model in the loop
       ↓
validateModelOutput() ──► composeSafeResponse() ──► Meta Cloud API
```

---

## 3. Provider Resolution

`OPENAI_API_KEY` is the documented variable; the endpoint is derived from the
key prefix, so any OpenAI-compatible provider works with the same configuration.

| Key prefix | Endpoint | Default model |
|---|---|---|
| `sk-…` | `api.openai.com` | `gpt-4o-mini` |
| `gsk_…` | `api.groq.com` | `llama-3.3-70b-versatile` |
| `xai-…` | `api.x.ai` | `grok-2-latest` |

`OPENAI_MODEL` overrides the default. `GEMINI_API_KEY` + `GEMINI_MODEL` supply
the fallback — the model id must be one Google actually serves, or every
fallback call 404s and the fallback is silently dead.

---

## 4. Grounding Rules

The system prompt and the injected context are built so the model cannot invent
facts it was not given:

- **Climate.** If no climate block is present, the model is instructed to say it
  has no current readings and ask for a location pin — never to state a
  temperature, AQI or UV figure that is not in the context.
- **Clinics.** If the clinic lookup returned nothing, an explicit
  `[NO CLINIC DATA]` instruction forbids naming any facility. Sending someone to
  the wrong hospital in an emergency is the worst available failure.
- **Location.** With no named city, no shared pin and nothing cached, no
  location is guessed. Climate advice anchored to the wrong city is wrong advice.
- **Safety constraints.** `buildConstraints()` output is injected as
  non-negotiable instructions that override anything else in the prompt.

---

## 5. Conversation Memory

History is keyed by the **WhatsApp sender id**, never by display name — keying
by name puts every unnamed user, and every pair of users sharing a first name,
into one shared bucket that then gets fed back into the prompt. History is
capped at 5 turns in the model path and at `MAX_HISTORY_TURNS` in the session
store, which also bounds PHI accumulation.

---

## 6. File Map

| Component | File | Responsibility |
|---|---|---|
| Orchestration | `whatsapp-bridge/server.js` (`generateAIResponse`) | Context assembly, safety call, provider chain, finalization |
| Primary provider | `whatsapp-bridge/server.js` (`generateGrokResponse`) | OpenAI-compatible chat completion with timeout |
| Fallback provider | `whatsapp-bridge/server.js` (`generateGeminiFallback`) | Google Gemini call |
| Climate context | `whatsapp-bridge/server.js` (`fetchClimateIntelligence`) | Open-Meteo weather + air quality |
| Clinic context | `whatsapp-bridge/server.js` (`findNearbyClinics`) | OpenStreetMap lookup with curated city fallback |
| Safety core | `shared/safetyCore.js` | Subject resolution, rule evaluation, constraints, output validation |
| Session / history | `whatsapp-bridge/lib/store.js` | Redis-backed sessions, capped history, idempotency |

---

## 7. Environment

```bash
OPENAI_API_KEY=            # or GROQ_API_KEY / XAI_API_KEY
OPENAI_MODEL=gpt-4o-mini
OPENAI_TIMEOUT_MS=30000

GEMINI_API_KEY=            # optional fallback
GEMINI_MODEL=gemini-2.0-flash
```

The server refuses to start with no inference key configured.

See [CLINICAL_SAFETY_ARCHITECTURE.md](CLINICAL_SAFETY_ARCHITECTURE.md) for the
rule registry and non-downgrade guarantees.
