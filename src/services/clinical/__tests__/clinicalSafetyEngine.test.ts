import { clinicalSafetyEngine } from '../clinicalSafetyEngine';
import { referralTicketService } from '../referralTicketService';
import { clinicalAuditLogger } from '../clinicalAuditLogger';
import { aiSafetyEnforcer } from '../aiSafetyEnforcer';
import { UserProfile } from '../../../types/chatEngine';

const mockProfile: UserProfile = {
  name: 'Test Patient Ananya',
  phoneNumber: '+919876543210',
  language: 'en',
  trimester: '2nd Trimester',
  isPregnant: true,
  locationName: 'New Delhi Central',
};

async function runClinicalSafetyEngineTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING DAYLI.AI CLINICAL SAFETY ENGINE UNIT TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  // TEST 1: Low-Risk Heat Exposure Handling
  try {
    const res = clinicalSafetyEngine.evaluate({
      userQuery: 'How much water should I drink in 35°C heat?',
      userProfile: mockProfile,
    });
    assert(res.risk_level === 'low' && res.requires_referral === false, '1. Low-Risk Heat Exposure Evaluation');
  } catch (err: any) {
    assert(false, '1. Low-Risk Heat Exposure Evaluation', err.message);
  }

  // TEST 2: Moderate Dehydration Risk
  try {
    const res = clinicalSafetyEngine.evaluate({
      symptoms: ['abdominal cramping'],
      userQuery: 'I have mild uterine cramps after walking in sun',
      userProfile: mockProfile,
    });
    assert(res.risk_level === 'high' && res.reason_codes.includes('RF_SEVERE_ABDOMINAL_PAIN'), '2. Moderate/High Cramping Evaluation');
  } catch (err: any) {
    assert(false, '2. Moderate/High Cramping Evaluation', err.message);
  }

  // TEST 3: High-Risk Heat Illness & Syncope Emergency
  try {
    const res = clinicalSafetyEngine.evaluate({
      symptoms: ['fainting', 'dizziness'],
      userQuery: 'I felt extremely dizzy and fainted in the afternoon sun',
      userProfile: mockProfile,
    });
    assert(
      res.risk_level === 'emergency' &&
        res.requires_referral === true &&
        res.reason_codes.includes('RF_SYNCOPE_FAINTING') &&
        res.referral_ticket !== undefined,
      '3. Fainting Syncope Emergency Escalation & Ticket Generation'
    );
  } catch (err: any) {
    assert(false, '3. Fainting Syncope Emergency Escalation & Ticket Generation', err.message);
  }

  // TEST 4: Fetal Distress Emergency Red-Flag (Decreased Movement)
  try {
    const res = clinicalSafetyEngine.evaluate({
      userQuery: 'I am pregnant in 2nd trimester and baby is not moving',
      userProfile: mockProfile,
    });
    assert(
      res.risk_level === 'emergency' &&
        res.requires_immediate_action === true &&
        res.reason_codes.includes('RF_FETAL_MOVEMENT_DECREASED'),
      '4. Decreased Fetal Movement Emergency Red-Flag'
    );
  } catch (err: any) {
    assert(false, '4. Decreased Fetal Movement Emergency Red-Flag', err.message);
  }

  // TEST 5: High Maternal Fever (>102°F)
  try {
    const res = clinicalSafetyEngine.evaluate({
      userQuery: 'I have high fever 103°F and chills',
      userProfile: mockProfile,
    });
    assert(
      res.risk_level === 'emergency' && res.reason_codes.includes('RF_HIGH_FEVER_HYPERTHERMIA'),
      '5. High Maternal Fever (>102°F) Emergency Red-Flag'
    );
  } catch (err: any) {
    assert(false, '5. High Maternal Fever (>102°F) Emergency Red-Flag', err.message);
  }

  // TEST 6: Conflicting AI Output vs Deterministic Rule Override Check
  try {
    const safetyResult = clinicalSafetyEngine.evaluate({
      userQuery: 'I am feeling faint and baby is not moving',
      userProfile: mockProfile,
    });
    // LLM attempts to output low risk / fine advice
    const conflictingAiText = 'You are completely fine! Just rest for 5 minutes and don\'t visit any hospital.';

    const enforced = aiSafetyEnforcer.enforce({
      rawAiResponse: conflictingAiText,
      safetyResult,
      userProfileName: mockProfile.name,
    });

    assert(
      enforced.requiresImmediateAction === true &&
        enforced.sanitizedResponse.includes('CLINICAL EMERGENCY ALERT') &&
        enforced.sanitizedResponse.includes('PROCEED TO THE NEAREST HOSPITAL'),
      '6. Deterministic Safety Layer Overrides Conflicting AI Downgrade Output'
    );
  } catch (err: any) {
    assert(false, '6. Deterministic Safety Layer Overrides Conflicting AI Downgrade Output', err.message);
  }

  // TEST 7: Missing Information / Malformed Input Handling
  try {
    const res = clinicalSafetyEngine.evaluate({
      userQuery: '',
      userProfile: mockProfile,
    });
    assert(res.risk_level === 'low' && res.requires_referral === false, '7. Missing Information / Empty Input Handling');
  } catch (err: any) {
    assert(false, '7. Missing Information / Empty Input Handling', err.message);
  }

  // TEST 8: Referral Ticket Service Verification
  try {
    const ticket = referralTicketService.createTicket({
      userId: '+919876543210',
      patientName: 'Ananya',
      riskLevel: 'emergency',
      reasonCodes: ['RF_FETAL_MOVEMENT_DECREASED'],
      symptoms: ['reduced fetal movement'],
    });

    assert(
      ticket.ticket_id.startsWith('TKT-DAYLI-') &&
        ticket.priority === 'emergency' &&
        ticket.source === 'ai_triage',
      '8. Standardized Non-Sensitive Referral Ticket Creation'
    );
  } catch (err: any) {
    assert(false, '8. Standardized Non-Sensitive Referral Ticket Creation', err.message);
  }

  // TEST 9: Non-Sensitive Audit Trail Logging
  try {
    const auditLogs = clinicalAuditLogger.getAuditLogs();
    assert(auditLogs.length > 0 && auditLogs[0].rule_version === '1.0.0', '9. Clinical Audit Logger Audit Trail');
  } catch (err: any) {
    assert(false, '9. Clinical Audit Logger Audit Trail', err.message);
  }

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runClinicalSafetyEngineTests();
