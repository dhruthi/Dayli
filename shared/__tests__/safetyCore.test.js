import { describe, it, expect } from 'vitest';
import {
  evaluateSafety,
  resolveSubject,
  composeSafeResponse,
  validateModelOutput,
  extractStatedTemperatureC,
  extractAgeMonths,
} from '../safetyCore.js';

const ev = (text, extra = {}) => evaluateSafety({ text, ...extra });

// ═══════════════════════════════════════════════════════════════════════════
// Subject typing — Part 4. Adult rules must never reach infants, and "unknown"
// must stay unknown rather than defaulting everyone to a pregnant adult.
// ═══════════════════════════════════════════════════════════════════════════

describe('subject resolution', () => {
  it('identifies an infant from the word baby', () => {
    expect(resolveSubject('my baby is crying').subject).toBe('infant');
  });

  it('treats a stated age over 12 months as a child, not an infant', () => {
    expect(resolveSubject('my baby is 18 months old').subject).toBe('child');
  });

  it('identifies pregnancy from the message, not from a stored default', () => {
    expect(resolveSubject('I am 7 months pregnant').subject).toBe('pregnant_person');
  });

  it('returns unknown rather than assuming pregnancy', () => {
    // Regression for C-12: every unidentified user was "Ananya Sharma", pregnant.
    expect(resolveSubject('what should I do about a headache').subject).toBe('unknown');
  });

  it('does not infer pregnancy from an empty profile', () => {
    expect(resolveSubject('hello', {}).subject).toBe('unknown');
  });

  it('extracts age in months across units and scripts', () => {
    expect(extractAgeMonths('my 2 month old')).toBe(2);
    expect(extractAgeMonths('she is 3 years old')).toBe(36);
    expect(extractAgeMonths('नवजात')).toBe(0);
    expect(extractAgeMonths('నా 2 నెలల బిడ్డ')).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Part 6 / Part 19 — the named critical regressions
// ═══════════════════════════════════════════════════════════════════════════

describe('critical intent + safety regressions', () => {
  it('"My baby is crying non stop" is not an emergency and not adult heat advice', () => {
    const r = ev('My baby is crying non stop');
    expect(r.subject).toBe('infant');
    expect(r.riskLevel).toBe('low');
    expect(r.requiresImmediateAction).toBe(false);
    // Must carry pediatric constraints so no adult litre target can be produced.
    expect(r.constraints.join(' ')).toMatch(/never give adult fluid targets in litres/i);
  });

  it('"My baby is crying non stop and is having trouble breathing" escalates', () => {
    const r = ev('My baby is crying non stop and is having trouble breathing');
    expect(r.subject).toBe('infant');
    expect(r.riskLevel).toBe('emergency');
    expect(r.reasonCodes).toContain('RESPIRATORY_DISTRESS');
  });

  it('an infant in respiratory distress is NEVER told to take fluids by mouth', () => {
    // Regression for C-06: the audited system said "offer ORS" to a baby who
    // could not breathe, which is an aspiration risk.
    const r = ev('My baby is crying non stop and is having trouble breathing');
    const steps = r.emergencyActions.join(' ').toLowerCase();
    expect(steps).toMatch(/do not give any food, milk, water or ors/i);
    expect(steps).not.toMatch(/sip .*ors|offer .*ors|small sips/i);
  });

  it('an infant emergency never receives adult obstetric positioning', () => {
    const r = ev('my baby is limp and not waking up');
    const steps = r.emergencyActions.join(' ').toLowerCase();
    expect(steps).not.toMatch(/left side/);
    expect(steps).not.toMatch(/placental/);
  });

  it('a weather question stays a weather question', () => {
    const r = ev('What is the temperature in New Delhi?');
    expect(r.riskLevel).toBe('low');
    expect(r.requiresReferral).toBe(false);
  });

  it('"How can I protect my baby from today\'s heat?" is not triage', () => {
    const r = ev("How can I protect my baby from today's heat?");
    expect(r.subject).toBe('infant');
    expect(r.riskLevel).toBe('low');
  });

  it('"warm weather" does not trigger limb-pain triage', () => {
    // Regression for H-04: the substring 'arm' inside 'warm' routed this to
    // clinical triage and returned leg-elevation advice.
    const r = ev('How do I keep my baby safe in warm weather?');
    expect(r.riskLevel).toBe('low');
    expect(r.redFlags).toHaveLength(0);
  });

  it('a house number is not a fever', () => {
    // Regression for C-09: 'flat 104' raised a full emergency + false referral.
    const r = ev('My address is flat 104 and I want heat tips');
    expect(r.riskLevel).toBe('low');
    expect(r.requiresReferral).toBe(false);
    expect(r.reasonCodes).not.toContain('HIGH_FEVER');
  });

  it('substring collisions do not fire rules', () => {
    for (const q of ['I want to come back tomorrow', 'my alarm is loud', 'a haircut appointment', 'the background is noisy']) {
      const r = ev(q);
      expect(r.riskLevel, `"${q}" should stay low risk`).toBe('low');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Infant fever — the defect observed live in Telugu
// ═══════════════════════════════════════════════════════════════════════════

describe('infant fever thresholds', () => {
  it('any fever in a baby under 3 months is an emergency', () => {
    const r = ev('My 2 month old baby has a fever of 39 degrees');
    expect(r.subject).toBe('infant');
    expect(r.riskLevel).toBe('emergency');
    expect(r.reasonCodes).toContain('INFANT_FEVER_UNDER_3_MONTHS');
  });

  it('applies the same rule when the age is unknown', () => {
    const r = ev('my baby has a fever');
    expect(r.riskLevel).toBe('emergency');
  });

  it('an older infant with a high fever is high risk, not low', () => {
    const r = ev('my 9 month old has a fever of 39.5C');
    expect(['high', 'emergency']).toContain(r.riskLevel);
    expect(r.requiresReferral).toBe(true);
  });

  it('reads temperature in Fahrenheit', () => {
    expect(extractStatedTemperatureC('102 F')).toBeCloseTo(38.9, 1);
    expect(extractStatedTemperatureC('39.5°C')).toBe(39.5);
  });

  it('ignores bare numbers with no unit and no fever context', () => {
    expect(extractStatedTemperatureC('house number 104')).toBeNull();
    expect(extractStatedTemperatureC('flat 102, block 39')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Part 18 — safety must be language-independent
// ═══════════════════════════════════════════════════════════════════════════

describe('language independence', () => {
  it('escalates a 2-month-old fever written in Telugu', () => {
    // Live-site regression: Telugu replied that 39°C in an infant was "natural".
    const r = ev('నా 2 నెలల బిడ్డకు 39 డిగ్రీల జ్వరం');
    expect(r.subject).toBe('infant');
    expect(r.riskLevel).toBe('emergency');
    expect(r.reasonCodes).toContain('INFANT_FEVER_UNDER_3_MONTHS');
  });

  it('escalates a 2-month-old fever written in Hindi', () => {
    const r = ev('मेरे 2 महीने के बच्चे को 39 डिग्री बुखार है');
    expect(r.subject).toBe('infant');
    expect(r.riskLevel).toBe('emergency');
  });

  it('reaches the same verdict in English, Hindi and Telugu', () => {
    const en = ev('my baby is having trouble breathing');
    const hi = ev('मेरे बच्चे को सांस लेने में तकलीफ है');
    const te = ev('నా బిడ్డకు శ్వాస తీసుకోవడంలో ఇబ్బంది');
    for (const r of [en, hi, te]) {
      expect(r.riskLevel).toBe('emergency');
      expect(r.reasonCodes).toContain('RESPIRATORY_DISTRESS');
    }
  });

  it('detects unresponsiveness across scripts', () => {
    expect(ev('my baby is unresponsive').riskLevel).toBe('emergency');
    expect(ev('मेरा बच्चा बेहोश है').riskLevel).toBe('emergency');
    expect(ev('నా బిడ్డకు స్పృహ లేదు').riskLevel).toBe('emergency');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Pregnancy
// ═══════════════════════════════════════════════════════════════════════════

describe('pregnancy red flags', () => {
  it('reduced fetal movement is an emergency', () => {
    const r = ev('I am pregnant and my baby is not moving as much today');
    expect(r.subject).toBe('pregnant_person');
    expect(r.riskLevel).toBe('emergency');
  });

  it('bleeding in pregnancy is an emergency', () => {
    expect(ev('I am pregnant and have vaginal bleeding').riskLevel).toBe('emergency');
  });

  it('pre-eclampsia warning signs escalate', () => {
    const r = ev('I am pregnant with a headache and blurred vision');
    expect(r.riskLevel).toBe('emergency');
    expect(r.reasonCodes).toContain('PREECLAMPSIA_WARNING_SIGNS');
  });

  it('heat alone during pregnancy is not an emergency', () => {
    const r = ev('I am 7 months pregnant and it is extremely hot today', {
      climate: { temperature_c: 42, feels_like_c: 46 },
    });
    expect(r.subject).toBe('pregnant_person');
    expect(r.riskLevel).toBe('moderate');
    expect(r.requiresImmediateAction).toBe(false);
  });

  it('does not apply fetal-movement rules to a non-pregnant subject', () => {
    const r = ev('my baby is not moving much when I put him down');
    expect(r.reasonCodes).not.toContain('REDUCED_FETAL_MOVEMENT');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Medication boundaries — Part 11
// ═══════════════════════════════════════════════════════════════════════════

describe('medication boundaries', () => {
  it('a dosing question is constrained to a referral', () => {
    const r = ev('how much paracetamol should I give my baby');
    expect(r.constraints.join(' ')).toMatch(/decline to give one and refer them to a clinician or pharmacist/i);
  });

  it('strips any dose the model produces anyway', () => {
    const safety = ev('my baby has a cold');
    const out = validateModelOutput({ text: 'Give 250 mg of paracetamol every 6 hours.', safety });
    expect(out.text).not.toMatch(/250\s*mg/i);
    expect(out.violations).toContain('STATED_MEDICATION_DOSE');
  });

  it('strips adult litre targets from pediatric replies', () => {
    const safety = ev('my baby is hot');
    const out = validateModelOutput({ text: 'Make sure they drink 3.5 L of water daily.', safety });
    expect(out.text).not.toMatch(/3\.5\s*L/i);
    expect(out.violations).toContain('ADULT_HYDRATION_TARGET_ON_PEDIATRIC_PATH');
  });

  it('leaves an adult reply with no dose untouched', () => {
    const safety = ev('I have a mild headache');
    const out = validateModelOutput({ text: 'Rest in a cool room and drink water.', safety });
    expect(out.violations).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// The model must not be able to override the deterministic verdict
// ═══════════════════════════════════════════════════════════════════════════

describe('the model cannot downgrade a deterministic decision', () => {
  it('strips reassurance from an emergency reply', () => {
    const safety = ev('my baby is having trouble breathing');
    const out = validateModelOutput({
      text: 'This is normal in babies, nothing to worry about, just wait and see.',
      safety,
    });
    expect(out.violations).toContain('DOWNGRADED_EMERGENCY');
    expect(out.text).not.toMatch(/nothing to worry about/i);
  });

  it('keeps the emergency banner ahead of the model text', () => {
    const safety = ev('my baby is having trouble breathing');
    const composed = composeSafeResponse({ safety, modelText: 'Here is some general advice.' });
    expect(composed).toMatch(/emergency medical care now/i);
    expect(composed.indexOf('emergency medical care')).toBeLessThan(composed.indexOf('general advice'));
  });

  it('preserves the model answer rather than discarding it', () => {
    // Regression for C-06: an emergency wholesale-replaced the subject-correct
    // response with a fixed adult template.
    const safety = ev('my baby is having trouble breathing');
    const composed = composeSafeResponse({ safety, modelText: 'UNIQUE_MODEL_CONTENT_MARKER' });
    expect(composed).toContain('UNIQUE_MODEL_CONTENT_MARKER');
  });

  it('still escalates with no model output at all', () => {
    const safety = ev('my baby is having trouble breathing');
    const composed = composeSafeResponse({ safety, modelText: '' });
    expect(composed).toMatch(/emergency medical care now/i);
    expect(composed).toMatch(/112/);
  });

  it('keeps high risk distinct from emergency', () => {
    // Regression for H-13: 'high' was silently upgraded, so every moderate
    // concern fired a full red-siren alert.
    const safety = ev('my 9 month old has a fever of 39.5C');
    const composed = composeSafeResponse({ safety, modelText: 'Some guidance.' });
    expect(composed).toMatch(/see a healthcare provider today/i);
    expect(composed).not.toMatch(/🚨/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// No fabrication
// ═══════════════════════════════════════════════════════════════════════════

describe('no fabricated data', () => {
  it('never names a facility or clinician', () => {
    const r = ev('my baby is having trouble breathing');
    const all = JSON.stringify(r);
    expect(all).not.toMatch(/District Maternal|OB-GYN|Apollo|TKT-DAYLI/i);
  });

  it('never states a climate figure that was not supplied', () => {
    const r = ev('what is the weather');
    expect(JSON.stringify(r)).not.toMatch(/41\.5|185|45\.2/);
  });

  it('forbids inventing climate and clinic values in its constraints', () => {
    const c = ev('anything').constraints.join(' ');
    expect(c).toMatch(/never state a temperature, aqi, uv or humidity figure that was not supplied/i);
    expect(c).toMatch(/never name a clinic, hospital, doctor or referral ticket/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Robustness — a webhook must never crash the pipeline
// ═══════════════════════════════════════════════════════════════════════════

describe('robustness', () => {
  it('handles empty, null and malformed input', () => {
    for (const t of ['', null, undefined, '   ', '🙂🙂🙂', 'x'.repeat(5000)]) {
      expect(() => evaluateSafety({ text: t })).not.toThrow();
    }
  });

  it('handles a missing signals object', () => {
    expect(evaluateSafety({ text: 'my baby cannot breathe' }).riskLevel).toBe('emergency');
  });

  it('accepts structured signals from the model as an escalation path', () => {
    const r = evaluateSafety({ text: 'something is wrong', subject: 'infant', signals: { cyanosis: true } });
    expect(r.riskLevel).toBe('emergency');
    expect(r.reasonCodes).toContain('CYANOSIS');
  });

  it('never lets structured signals downgrade a text-detected flag', () => {
    const r = evaluateSafety({
      text: 'my baby is having trouble breathing',
      signals: { breathingDifficulty: false, severity: 'mild' },
    });
    expect(r.riskLevel).toBe('emergency');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// WhatsApp text formatting & asterisk sanitation
// ═══════════════════════════════════════════════════════════════════════════

describe('WhatsApp text formatting & asterisk sanitation', () => {
  it('removes markdown double asterisks from text', () => {
    const safety = ev('how to feed baby');
    const input = 'Here are **Basic needs** for your baby. **Diaper:** clean and dry.';
    const result = validateModelOutput({ text: input, safety });
    expect(result.text).not.toContain('**');
    expect(result.text).toContain('Basic needs');
    expect(result.text).toContain('Diaper: clean and dry.');
  });

  it('cleans bullet item labels wrapped in asterisks', () => {
    const safety = ev('baby is crying');
    const input = '• *Diaper:* clean and dry?\n• *Feeding:* hungry?\n• *Swaddle* snugly.';
    const result = validateModelOutput({ text: input, safety });
    expect(result.text).toBe('• Diaper: clean and dry?\n• Feeding: hungry?\n• Swaddle snugly.');
  });

  it('strips markdown header hashes', () => {
    const safety = ev('general health');
    const input = '### Practical tips for today\n## Another section';
    const result = validateModelOutput({ text: input, safety });
    expect(result.text).toBe('Practical tips for today\nAnother section');
  });

  it('strips incomplete or trailing LLM-generated disclaimers so canonical disclaimer is clean', () => {
    const safety = ev('give me weather map');
    const input = 'Drink water and stay cool.\n\ndayli gives general guidance, not a ';
    const result = validateModelOutput({ text: input, safety });
    expect(result.text).toBe('Drink water and stay cool.');

    const composed = composeSafeResponse({ safety, modelText: result.text });
    expect(composed).toContain('_dayli gives general guidance, not a diagnosis. For emergencies call 112._');
    expect(composed).not.toContain('not a \n');
  });
});

