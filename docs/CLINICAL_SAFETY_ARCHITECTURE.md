# dayli.ai Clinical Safety Architecture

## 1. Overview
The **dayli.ai Climate Health Copilot** pairs a language model with a
**deterministic clinical safety core** (`shared/safetyCore.js`, rule version
**2.0.0**). The model writes prose. **Risk classification, red-flag detection,
emergency escalation and the hard constraints on what the model may say are
decided by rule code**, and the model's output is validated against that
decision before it is delivered.

---

## 2. Pipeline

```
Inbound WhatsApp message
               ↓
resolveSubject(text, profile)
  → adult · pregnant_person · postpartum_person · infant · child · unknown
               ↓
evaluateSafety({ text, subject, ageMonths, climate, signals })
  → riskLevel · redFlags · reasonCodes · requiresReferral · constraints
               ↓
buildConstraints() ──► injected into the model prompt as non-negotiable rules
               ↓
        Model generates a reply
               ↓
validateModelOutput({ text, safety })
  → rejects or corrects any output that contradicts the rule decision
               ↓
composeSafeResponse({ safety, modelText })
  → emergency actions first, model prose second, disclaimer last
               ↓
Outbound WhatsApp message
```

Subject resolution runs before rule evaluation because the same sentence means
different things for different people: "fever" in a six-week-old is an
emergency, in an adult it is a high-risk flag. The system never assumes a
subject it has not been told — it resolves to `unknown` and applies the
conservative path.

---

## 3. Red-Flag Rule Registry (v2.0.0)

Rules are subject-scoped. A rule with subject `all` fires for anyone; the rest
only fire when the resolved subject matches.

| Rule ID | Reason Code | Subject | Risk | Trigger |
|---|---|---|---|---|
| `RF_RESP_DISTRESS` | `RESPIRATORY_DISTRESS` | all | Emergency | Difficulty breathing |
| `RF_CYANOSIS` | `CYANOSIS` | all | Emergency | Blue or grey lips or skin |
| `RF_UNRESPONSIVE` | `ALTERED_CONSCIOUSNESS` | all | Emergency | Unresponsiveness or extreme drowsiness |
| `RF_SEIZURE` | `SEIZURE` | all | Emergency | Seizure or convulsion |
| `RF_SEVERE_BLEEDING` | `SEVERE_BLEEDING` | all | Emergency | Heavy bleeding |
| `RF_SELF_HARM` | `SELF_HARM_RISK` | all | Emergency | Thoughts of self-harm |
| `RF_HEAT_STROKE` | `SUSPECTED_HEAT_STROKE` | all | Emergency | Signs of heat stroke |
| `RF_INFANT_FEVER_UNDER_3M` | `INFANT_FEVER_UNDER_3_MONTHS` | infant | Emergency | Fever in a baby under 3 months |
| `RF_INFANT_HIGH_FEVER` | `INFANT_HIGH_FEVER` | infant, child | High | High fever in a young child |
| `RF_INFANT_DEHYDRATION` | `INFANT_DEHYDRATION` | infant, child | High | Signs of dehydration |
| `RF_INFANT_POOR_FEEDING` | `POOR_FEEDING` | infant | High | Refusing feeds |
| `RF_REDUCED_FETAL_MOVEMENT` | `REDUCED_FETAL_MOVEMENT` | pregnant | Emergency | Reduced fetal movement |
| `RF_VAGINAL_BLEEDING` | `VAGINAL_BLEEDING_IN_PREGNANCY` | pregnant, postpartum | Emergency | Bleeding during pregnancy |
| `RF_FLUID_LEAK` | `AMNIOTIC_FLUID_LEAK` | pregnant | Emergency | Fluid leaking |
| `RF_PREECLAMPSIA` | `PREECLAMPSIA_WARNING_SIGNS` | pregnant, postpartum | Emergency | Vision changes or facial swelling |
| `RF_MATERNAL_FEVER` | `MATERNAL_FEVER` | pregnant, postpartum | High | Fever during pregnancy |
| `RF_CHEST_PAIN` | `CHEST_PAIN` | adult, pregnant, postpartum, unknown | Emergency | Chest pain |
| `RF_ADULT_HIGH_FEVER` | `HIGH_FEVER` | adult, unknown | High | High fever |

Each rule matches on a multilingual lexicon **and** on structured signals, so a
message written in Telugu or Hindi triggers the same rule as its English
equivalent. Climate exposure (`feels_like_c ≥ 45`) raises the risk floor to
`moderate` and adds `EXTREME_HEAT_EXPOSURE`, but never creates an emergency on
its own.

---

## 4. Non-Downgrade Guarantees

> [!IMPORTANT]
> 1. The model is **never** the authority on emergency classification or risk level.
> 2. `validateModelOutput()` inspects the generated text against the rule
>    decision and corrects violations — for example an adult hydration target
>    emitted on a pediatric path (`ADULT_HYDRATION_TARGET_ON_PEDIATRIC_PATH`).
> 3. `composeSafeResponse()` puts deterministic emergency actions **ahead of**
>    model prose rather than replacing the reply wholesale, so a correct answer
>    is not discarded when an escalation fires.
> 4. `buildConstraints()` forbids the model from naming a clinic, hospital,
>    doctor or referral that was not supplied in the context block, and from
>    inventing doses.

---

## 5. Emergency Actions

When `riskLevel === 'emergency'`, `emergencyActions()` returns subject-specific
first steps that are emitted verbatim — never model-generated. Self-harm risk
routes to Tele-MANAS (**14416**); everything else leads with emergency services
(**112**, India), then airway-aware guidance that differs for infants, pregnant
and postpartum people, and other adults.

---

## 6. Tests

`shared/__tests__/safetyCore.test.js` covers subject resolution, rule firing
across languages, non-downgrade behaviour and output validation. Run with
`npm test`.

---

## 7. Disclaimer

> [!CAUTION]
> dayli.ai provides evidence-based climate-health decision support and triage
> assistance based on WHO/UNICEF maternal and child heat guidelines. It is not a
> certified diagnostic medical device. Users experiencing a medical emergency
> must contact local emergency services or a qualified physician immediately.
