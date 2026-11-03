# Step-by-Step Reproduction Guide
**Verifying Dayli Human-Scale AI Architecture from Scratch**

---

## 1. Prerequisites

- **Node.js:** v18.0.0 or higher (v20+ recommended).
- **Python:** v3.10, 3.11, 3.12, 3.13, or 3.14.
- **Operating System:** Linux, macOS, or Windows (WSL).
- **Hardware:** Standard CPU (No GPU required).

---

## 2. Quickstart: Reproduce Everything in 3 Minutes

From the repository root (`Dayli AI`):

```bash
# 1. Create a Python virtual environment and install lightweight ML dependencies
python3 -m venv ml/.venv
source ml/.venv/bin/activate
pip install numpy scikit-learn

# 2. Build the multilingual dataset (1,686 rows across EN, TE, HI, Tenglish, Hinglish)
python3 ml/build_dataset.py

# 3. Train the dual-head sparse linear model and export compact 216 KB JSON weights
python3 ml/train.py

# 4. Install Node.js dependencies for the WhatsApp bridge
cd whatsapp-bridge
npm install

# 5. Run the in-process latency & accuracy benchmark
npm run bench:router

# 6. Run the complete test suite (asserts 100% pass across all 24 suites / 321 tests)
npm test

# 7. Run the strict frontier-off verification (asserts 0 network calls to OpenAI/Gemini/Groq)
npx vitest run __tests__/frontierOff.test.js
```

---

## 3. Detailed Verification Steps

### Step 3.1: Dataset Generation
Run:
```bash
python3 ml/build_dataset.py
```
**Expected Output:**
- Generates `ml/data/train.jsonl` (1,343 balanced queries).
- Generates `ml/data/eval/holdout.jsonl` (343 held-out queries).
- Generates `ml/DATA_CARD.md`.
- Deterministic seed `42` guarantees byte-for-byte reproducibility across operating systems.

### Step 3.2: Model Training & Weight Export
Run:
```bash
python3 ml/train.py
```
**Expected Output:**
- Extracts FNV-1a 32-bit features (char 3-5 n-grams, word 1-2 n-grams into 16,384 sparse buckets).
- Fits Dual-head Logistic Regression with class-weighted loss.
- Prunes weights to top 800 features per class.
- Exports model to `whatsapp-bridge/models/dayli-router-v1.json` (**216.7 KB**).
- Holdout Intent Accuracy: **100.0%**
- Holdout Urgency Accuracy: **98.5%**
- Holdout Emergency Recall: **100.0%**

### Step 3.3: In-Process Latency & Throughput Benchmark
Run:
```bash
cd whatsapp-bridge
npm run bench:router
```
**Expected Output:**
```
================================================================
 DAYLI AI — HUMAN-SCALE MULTILINGUAL ROUTER BENCHMARK
================================================================

Model File:           .../whatsapp-bridge/models/dayli-router-v1.json
Model Size:           216.7 KB (< 1 MB Mozilla threshold)
Feature Space:        16384 hashed buckets (FNV-1a 32-bit)
Intents:              15 classes
Urgency Levels:       3 classes

Mean Latency:         ~0.42 ms
p50 (Median):         ~0.40 ms
p95 Latency:          ~0.50 ms
p99 Latency:          ~0.58 ms
Throughput:           > 2,000 queries / second / core
Holdout Accuracy:     100.0% Intent, 100.0% Emergency Recall
```

### Step 3.4: Frontier-Off Zero-Network Request Verification
Run:
```bash
npx vitest run __tests__/frontierOff.test.js
```
**Verification Criterion:**
- Tests run with `DAYLI_CORE_MODE=local` and all API keys unset.
- A global network interceptor asserts that **zero requests** are dispatched to:
  - `https://api.openai.com`
  - `https://generativelanguage.googleapis.com`
  - `https://api.groq.com`
  - `https://api.x.ai`
- All clinical, emergency, hydration, and weather workflows operate authoritatively in-process.

---

## 4. Running the Local Service

To run Dayli AI WhatsApp bridge in pure local Human-Scale mode:

```bash
# In whatsapp-bridge directory:
export DAYLI_CORE_MODE=local
export META_WHATSAPP_VERIFY_TOKEN=test_verify_token
export META_WHATSAPP_PHONE_NUMBER_ID=123456789
export META_WHATSAPP_ACCESS_TOKEN=test_access_token
export ALLOW_UNVERIFIED_WEBHOOKS=true

npm start
```
Notice: The service boots immediately with:
```
[CORE MODE] Running in "local" mode (isLocalOnly=true, allowFrontier=false)
```
Without requiring any OpenAI, Gemini, or Groq API keys!
