# Dayli Multilingual Climate-Health Intent & Urgency Dataset (v1)

## Summary
Curated multilingual training and benchmark holdout dataset created specifically for Dayli's Human-Scale AI router. Covers maternal, neonatal, and climate heat risks across 8 Indian languages (English, Telugu, Hindi, Tamil, Kannada, Malayalam, Marathi, Bengali) and their Romanized colloquial dialects.

## Dataset Statistics
- **Total Samples**: 2616
- **Training Samples**: 2085 (`ml/data/train.jsonl`)
- **Holdout Test Samples**: 531 (`ml/data/eval/holdout.jsonl`)
- **Languages**:
  - `en`: English
  - `te`: Telugu (తెలుగు) & `te-Latn` (Tenglish)
  - `hi`: Hindi (हिन्दी) & `hi-Latn` (Hinglish)
  - `ta`: Tamil (தமிழ்) & `ta-Latn` (Tanglish)
  - `kn`: Kannada (ಕನ್ನಡ) & `kn-Latn` (Kanglish)
  - `ml`: Malayalam (മലയാളം) & `ml-Latn` (Manglish)
  - `mr`: Marathi (मराठी) & `mr-Latn` (Marathlish)
  - `bn`: Bengali (বাংলা) & `bn-Latn` (Banglish)

## Taxonomy
- **14 Core Intents + 1 Out of Scope Class**:
  1. `weather_now_24h`: Real-time temperature, heat shifts, rain & nighttime lows.
  2. `weather_5day`: 5-day / multi-day forecast & outlooks.
  3. `heat_hydration`: Heat prevention, ORSL, coconut water, infant hydration safety.
  4. `air_quality`: Pollution, AQI index, smoke, dust alerts.
  5. `facility_hospital_labour`: Nearest ready labour room, bed availability, maternity centers.
  6. `facility_pharmacy`: Nearest pharmacy / 24h chemist.
  7. `symptom_pregnancy`: Contractions, bleeding, water breaking, preeclampsia symptoms.
  8. `symptom_infant_child`: Breathing distress, fontanelle depression, loose stools, colic.
  9. `symptom_fever`: Infant/pediatric/maternal fever, sponging guidance.
  10. `symptom_general_adult`: Heat exhaustion, heat stroke collapse, muscle cramps.
  11. `daily_brief_subscribe`: Subscribe/unsubscribe to daily 7 AM forecast alerts.
  12. `feedback_survey`: 30-second CSAT MCQ quality survey.
  13. `opt_out_delete`: Immediate DPDP Act data deletion & opt-out.
  14. `greeting_smalltalk`: Greetings, capabilities, identity.
  15. `out_of_scope`: Non-health/non-climate requests (filtered to maintain clinical scope).

- **3 Urgency Tiers**:
  - `emergency_signal`: Critical maternal/pediatric danger signs.
  - `same_day`: High-risk or urgent review needed today.
  - `routine`: Standard daily questions and care navigation.

## Ethical Standards & Privacy
- **Zero-PHI**: No real phone numbers, names, or addresses are stored or used.
- **DPDP Act 2023 Compliant**: Completely de-identified seed corpus.
- **Licence**: Creative Commons Attribution 4.0 International (CC-BY-4.0).
