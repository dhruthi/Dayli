# Dayli.ai Clinical Safety & Referral System Architecture

## 1. Overview
The **Dayli.ai Climate Health Copilot** combines natural language understanding with a strict **Deterministic Clinical Safety Engine (v1.0.0)**. While OpenAI processes user queries and provides empathetic explanations, **all risk classification, emergency escalations, red-flag determinations, and hospital referral decisions are strictly governed by deterministic rule code**.

---

## 2. Safety Architecture & Enforcer Pipeline

```
User Query (WhatsApp / Simulator)
               ↓
AI Symptom Extraction (NLU Parsing)
               ↓
Deterministic Clinical Safety Engine (Rule Registry v1.0.0)
               ↓
   Is Red-Flag Present? (Fetal Distress, Syncope, High Fever >102°F, Heat Stroke)
    ├── YES ──► Risk = EMERGENCY / HIGH ──► Generate Referral Ticket (TKT-DAYLI-XXXXX)
    └── NO  ──► Risk = LOW / MODERATE  ──► Routine Hydration & Heat Advisory
               ↓
AISafetyEnforcer (Validates AI Output Against Rule Decision)
    └── Rejects / Overrides any LLM attempts to downgrade emergency status
               ↓
Outbound WhatsApp Message Response + Clinical Audit Trail Log
```

---

## 3. Explicit Red-Flag Rule Registry (v1.0.0)

| Rule ID | Rule Name | Category | Reason Code | Risk Level | Trigger Criteria |
|---|---|---|---|---|---|
| **RF_001** | Decreased Fetal Movement | Fetal Distress | `RF_FETAL_MOVEMENT_DECREASED` | Emergency | Reduced or absent kick count in 2nd/3rd trimester |
| **RF_002** | Vaginal Bleeding | Fetal Distress | `RF_MATERNAL_BLEEDING` | Emergency | Any vaginal spotting or hemorrhage |
| **RF_003** | Amniotic Fluid Leak | Fetal Distress | `RF_AMNIOTIC_FLUID_LEAK` | Emergency | Clear discharge or premature membrane rupture |
| **RF_004** | Severe Cramping | Fetal Distress | `RF_SEVERE_ABDOMINAL_PAIN` | High | Severe uterine contractions or abdominal pain |
| **RF_005** | Fainting / Syncope | CNS Heat Stroke | `RF_SYNCOPE_FAINTING` | Emergency | Loss of consciousness or collapse |
| **RF_006** | High Fever (>102°F) | CNS Heat Stroke | `RF_HIGH_FEVER_HYPERTHERMIA` | Emergency | Core temperature > 39°C / 102°F |
| **RF_007** | Altered Mental Status | CNS Heat Stroke | `RF_HEAT_STROKE_CNS` | Emergency | Disorientation, confusion, or heat stroke symptoms |
| **RF_008** | Chest Pain / Dyspnea | Maternal Severe | `RF_CHEST_PAIN_DYSPNEA` | Emergency | Severe thoracic pain or acute dyspnea |
| **RF_009** | Severe Dehydration | Maternal Severe | `RF_SEVERE_DEHYDRATION_ANURIA` | High | Uncontrollable vomiting or no urine for >8h |
| **RF_010** | Pediatric Lethargy | Pediatric Heat | `RF_PEDIATRIC_LETHARGY` | Emergency | Infant lethargy, unresponsiveness, or sunken fontanelle |

---

## 4. AI Limitation & Non-Downgrade Safeguards

> [!IMPORTANT]
> **OpenAI Model Limitations**:
> 1. The LLM is **NEVER** the final authority for emergency classification, referral decisions, risk thresholds, or drug dosages.
> 2. The `AISafetyEnforcer` intercepts all AI outputs before message delivery. If the Safety Engine classifies a case as `emergency` or `high`, the enforcer automatically replaces/augments the AI response with mandatory emergency triage steps and a priority referral ticket.
> 3. The LLM is strictly prohibited from inventing custom prescription drug dosages or claiming diagnostic medical certainty.

---

## 5. Non-Sensitive Audit Trail Logging

Every clinical query generates an immutable audit record in `clinicalAuditLogger`:
```typescript
export interface ClinicalAuditEntry {
  request_id: string;
  timestamp: string;
  rule_version: "1.0.0";
  risk_level: "low" | "moderate" | "high" | "emergency";
  reason_codes: string[];
  symptoms_noted: string[];
  requires_referral: boolean;
  requires_immediate_action: boolean;
  ticket_id?: string;
  overridden_by_llm: false; // Guaranteed
}
```

---

## 6. Disclaimer

> [!CAUTION]
> **Clinical Guidance Disclaimer**: Dayli.ai Climate Health Copilot provides evidence-based climate health decision support and triage assistance based on WHO/UNICEF maternal heat guidelines. This platform is not a certified diagnostic medical device. Users experiencing medical emergencies must consult local emergency services or a qualified physician immediately.
