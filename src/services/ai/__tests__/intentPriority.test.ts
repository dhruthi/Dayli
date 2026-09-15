import { intentRouter } from '../intentRouter';
import { aiOrchestrator } from '../aiOrchestrator';
import { UserProfile } from '../../../types/chatEngine';

const mockProfile: UserProfile = {
  name: 'Ananya Sharma',
  phoneNumber: '+919876543210',
  language: 'en',
  trimester: '2nd Trimester',
  isPregnant: true,
  locationName: 'New Delhi Central',
};

async function runIntentPriorityTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING AI ORCHESTRATION INTENT PRIORITY TESTS');
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

  // TEST 1: "My baby is crying non stop"
  try {
    const query = 'My baby is crying non stop';
    const intentRes = await intentRouter.classifyIntent(query);
    const orchestratorRes = await aiOrchestrator.processUserMessage({ userQuery: query, userProfile: mockProfile });

    assert(
      intentRes.intent === 'clinical_triage' &&
        (intentRes.subject_type === 'infant' || intentRes.subject_type === 'child') &&
        intentRes.requires_triage === true &&
        !orchestratorRes.response.includes('3.5 Liters') &&
        !orchestratorRes.response.includes('HEAT & CLIMATE HEALTH GUIDANCE'),
      'TEST 1: "My baby is crying non stop" -> clinical_triage, pediatric, no adult hydration target'
    );
  } catch (err: any) {
    assert(false, 'TEST 1: "My baby is crying non stop"', err.message);
  }

  // TEST 2: "My baby has been crying continuously and is not feeding"
  try {
    const query = 'My baby has been crying continuously and is not feeding';
    const intentRes = await intentRouter.classifyIntent(query);
    assert(
      intentRes.intent === 'clinical_triage' && intentRes.requires_triage === true,
      'TEST 2: "My baby has been crying continuously and is not feeding"'
    );
  } catch (err: any) {
    assert(false, 'TEST 2: "My baby has been crying continuously and is not feeding"', err.message);
  }

  // TEST 3: "My baby is crying and having trouble breathing"
  try {
    const query = 'My baby is crying and having trouble breathing';
    const intentRes = await intentRouter.classifyIntent(query);
    const orchestratorRes = await aiOrchestrator.processUserMessage({ userQuery: query, userProfile: mockProfile });
    assert(
      (intentRes.intent === 'emergency' || intentRes.intent === 'clinical_triage') &&
        orchestratorRes.riskLevel === 'High / Emergency' &&
        orchestratorRes.requiresReferral === true,
      'TEST 3: "My baby is crying and having trouble breathing" -> Emergency referral pathway'
    );
  } catch (err: any) {
    assert(false, 'TEST 3: "My baby is crying and having trouble breathing"', err.message);
  }

  // TEST 4: "My baby feels very hot and is unusually sleepy"
  try {
    const query = 'My baby feels very hot and is unusually sleepy';
    const intentRes = await intentRouter.classifyIntent(query);
    assert(
      intentRes.intent === 'clinical_triage' && intentRes.requires_triage === true,
      'TEST 4: "My baby feels very hot and is unusually sleepy"'
    );
  } catch (err: any) {
    assert(false, 'TEST 4: "My baby feels very hot and is unusually sleepy"', err.message);
  }

  // TEST 5: "What is the temperature in New Delhi?"
  try {
    const query = 'What is the temperature in New Delhi?';
    const intentRes = await intentRouter.classifyIntent(query);
    assert(intentRes.intent === 'weather_climate', 'TEST 5: "What is the temperature in New Delhi?" -> weather_climate');
  } catch (err: any) {
    assert(false, 'TEST 5: "What is the temperature in New Delhi?"', err.message);
  }

  // TEST 6: "How can I protect my baby from today's heat?"
  try {
    const query = "How can I protect my baby from today's heat?";
    const intentRes = await intentRouter.classifyIntent(query);
    assert(
      intentRes.intent === 'general_care' || intentRes.intent === 'weather_climate',
      'TEST 6: "How can I protect my baby from today\'s heat?"'
    );
  } catch (err: any) {
    assert(false, 'TEST 6: "How can I protect my baby from today\'s heat?"', err.message);
  }

  // TEST 7: "The AQI is bad today, what should I do?"
  try {
    const query = 'The AQI is bad today, what should I do?';
    const intentRes = await intentRouter.classifyIntent(query);
    assert(
      intentRes.intent === 'weather_climate' || intentRes.intent === 'general_care',
      'TEST 7: "The AQI is bad today, what should I do?" -> weather_climate'
    );
  } catch (err: any) {
    assert(false, 'TEST 7: "The AQI is bad today, what should I do?"', err.message);
  }

  // TEST 8: "My baby is crying because it is so hot"
  try {
    const query = 'My baby is crying because it is so hot';
    const intentRes = await intentRouter.classifyIntent(query);
    assert(
      intentRes.intent === 'clinical_triage' && intentRes.requires_triage === true,
      'TEST 8: "My baby is crying because it is so hot" -> clinical_triage (climate secondary)'
    );
  } catch (err: any) {
    assert(false, 'TEST 8: "My baby is crying because it is so hot"', err.message);
  }

  // TEST 9: "My baby missed a medication dose"
  try {
    const query = 'My baby missed a medication dose';
    const intentRes = await intentRouter.classifyIntent(query);
    assert(intentRes.intent === 'medication_adherence', 'TEST 9: "My baby missed a medication dose" -> medication_adherence');
  } catch (err: any) {
    assert(false, 'TEST 9: "My baby missed a medication dose"', err.message);
  }

  // TEST 10: "My baby has been vomiting repeatedly"
  try {
    const query = 'My baby has been vomiting repeatedly';
    const intentRes = await intentRouter.classifyIntent(query);
    assert(intentRes.intent === 'clinical_triage', 'TEST 10: "My baby has been vomiting repeatedly" -> clinical_triage');
  } catch (err: any) {
    assert(false, 'TEST 10: "My baby has been vomiting repeatedly"', err.message);
  }

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runIntentPriorityTests();
