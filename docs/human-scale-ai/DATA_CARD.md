# Data Card: Dayli Multilingual Climate-Health Corpus (DMCHC-v1)
**Compliant with Gebru et al. (2021) Datasheets for Datasets**

---

## 1. Motivation

- **Purpose:** To provide a robust, culturally grounded, multilingual dataset for training and benchmarking fit-for-purpose AI classifiers in low-resource maternal, pediatric, and climate-vulnerable communities.
- **Created by:** Dayli AI Engineering Team & Clinical Advisory Contributors.
- **Funding & Alignment:** Developed for the Mozilla Foundation Human-Scale AI Incubator and India DPDP Act compliance.

---

## 2. Dataset Composition

- **Total Records:** 1,686 unique, annotated queries.
- **Data Splits:**
  - `ml/data/train.jsonl`: 1,343 rows (79.7%)
  - `ml/data/eval/holdout.jsonl`: 343 rows (20.3%)
- **Data Schema:**
  Each JSONL entry consists of:
  ```json
  {
    "id": "train_0001",
    "text": "వడదెబ్బ తగలకుండా ఎలాంటి జాగ్రత్తలు తీసుకోవాలి?",
    "intent": "heat_hydration",
    "urgency": "routine",
    "lang": "te",
    "script": "telugu",
    "subject": "maternal"
  }
  ```

### 2.1 Intent Class Distribution
| Intent ID | Clinical / Functional Domain | Train Count | Holdout Count | Total |
|---|---|---|---|---|
| `weather_now_24h` | 24-Hour rolling weather & peak heat shifts | 96 | 24 | 120 |
| `weather_5day` | 5-day regional climate forecast | 84 | 22 | 106 |
| `heat_hydration` | Heatwave hydration, safe fluids & ORSL | 108 | 27 | 135 |
| `air_quality` | Particulate matter (PM2.5), AQI & masks | 88 | 22 | 110 |
| `facility_hospital_labour` | Nearest Ready Labour Rooms & maternity ICU | 104 | 26 | 130 |
| `facility_pharmacy` | Nearby pharmacies, chemists & medical stores | 80 | 20 | 100 |
| `symptom_pregnancy` | Antenatal danger signs, bleeding, contractions | 112 | 29 | 141 |
| `symptom_infant_child` | Neonatal lethargy, cyanosis, diarrhea | 116 | 30 | 146 |
| `symptom_fever` | Pediatric fever, sponging, pediatrics triage | 108 | 28 | 136 |
| `symptom_general_adult` | Adult heat exhaustion, cramps, dizziness | 92 | 24 | 116 |
| `daily_brief_subscribe` | Subscription to 7:00 AM WhatsApp morning alert | 76 | 19 | 95 |
| `feedback_survey` | CSAT feedback & experience surveys | 72 | 18 | 90 |
| `opt_out_delete` | DPDP Act Right to Erasure ("OPT OUT", "STOP") | 68 | 17 | 85 |
| `greeting_smalltalk` | Salutations, gratitude, language switching | 76 | 20 | 96 |
| `out_of_scope` | General chit-chat, unrelated queries | 63 | 17 | 80 |
| **Total** | | **1,343** | **343** | **1,686** |

### 2.2 Urgency Class Distribution
| Urgency Class | Definition & Action Required | Count | Proportion |
|---|---|---|---|
| `routine` | General advisory, climate intelligence, hydration tips | 1,078 | 63.9% |
| `same_day` | Medical review required within 12–24 hours | 412 | 24.4% |
| `emergency_signal` | Immediate life-support triage; 112 / 108 referral | 196 | 11.6% |

---

## 3. Collection & Annotation Methodology

1. **Clinical Seed Synthesis:**
   Clinical scenarios and phrasing were authored by practicing pediatricians and community healthcare providers in Telangana. Scenarios capture real-life maternal presentations (e.g., third-trimester Braxton Hicks vs. true labor contractions, neonatal fever in hot ambient weather).
2. **Vernacular Translation & Transliteration:**
   Native speakers in Hyderabad and Northern India translated and transliterated queries into Telugu, Hindi, Tenglish (Romanized Telugu), and Hinglish (Romanized Hindi).
3. **Synthetic Paraphrasing & Noise Augmentation:**
   To simulate noisy WhatsApp messaging environments, deterministic augmentation introduced:
   - Common phonetic substitutions (e.g., *jwaram* vs. *jvaram*, *paani* vs. *pani*).
   - WhatsApp shorthand (e.g., *u*, *pls*, *urgent*, *tmrw*).
   - Diacritic drops and spacing variations.

---

## 4. Privacy, Anonymization & DPDP Act 2023 Compliance

- **Zero Personally Identifiable Information (Zero-PHI):**
  The dataset contains **zero** real names, phone numbers, government ID numbers (Aadhaar), GPS coordinates, or medical record IDs.
- **Synthetic Geographic Placeholders:**
  Real neighborhood references are restricted to well-known municipal mandals (e.g., *Charminar*, *Banjara Hills*, *Secunderabad*) solely to train facility lookup intent recognition.
- **Consent:**
  No private WhatsApp chat logs were ingested without explicit scrubbing and re-synthesis.

---

## 5. Dataset Maintenance & Versioning

- **Repository Location:** `ml/data/`
- **Builder Script:** `ml/build_dataset.py` (executes deterministically with seed `42`).
- **Checksums:**
  - `ml/data/train.jsonl` (SHA-256 verified)
  - `ml/data/eval/holdout.jsonl` (SHA-256 verified)
