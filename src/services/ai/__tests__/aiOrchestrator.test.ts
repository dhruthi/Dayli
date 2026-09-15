import { aiOrchestrator } from '../aiOrchestrator';
import { checkOpenAIHealthStatus, getOpenAIConfig } from '../config';
import { intentRouter } from '../intentRouter';
import { safetyLayer } from '../safetyLayer';
import { UserProfile } from '../../../types/chatEngine';
import { WeatherData } from '../../../types/services';

const mockProfile: UserProfile = {
  name: 'Test Patient Ananya',
  phoneNumber: '+919876543210',
  language: 'en',
  trimester: '2nd Trimester',
  isPregnant: true,
  locationName: 'New Delhi Central',
  latitude: 28.6139,
  longitude: 77.209,
};

const mockWeather: WeatherData = {
  cityName: 'New Delhi Central',
  temperatureC: 42.0,
  feelsLikeC: 46.5,
  humidityPercent: 55,
  aqi: 195,
  aqiStatus: 'Unhealthy',
  uvIndex: 10,
  weatherConditionText: 'Extreme Heatwave',
  heatWaveAdvisory: true,
  heatLevel: 'Extreme Danger',
  maternalRiskLevel: 'High Risk',
  hydrationTargetLiters: 3.8,
  recommendation: 'Stay indoors with cool towels',
  coolingAdvice: 'Apply ice compresses',
};

async function runAllTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING DAYLI.AI ORCHESTRATION ARCHITECTURE TESTS');
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

  // TEST 1: OpenAI Configuration Loading
  try {
    const config = getOpenAIConfig();
    assert(typeof config.model === 'string' && config.timeoutMs > 0, '1. OpenAI Configuration Loading');
  } catch (err: any) {
    assert(false, '1. OpenAI Configuration Loading', err.message);
  }

  // TEST 2: Missing API Key Health Check
  try {
    const health = checkOpenAIHealthStatus('');
    assert(health.status === 'error' && health.isConfigured === false, '2. Missing API Key Handling');
  } catch (err: any) {
    assert(false, '2. Missing API Key Handling', err.message);
  }

  // TEST 3: Invalid API Key Health Check
  try {
    const health = checkOpenAIHealthStatus('invalid-key-123');
    assert(health.status === 'error' && health.isConfigured === false, '3. Invalid API Key Handling');
  } catch (err: any) {
    assert(false, '3. Invalid API Key Handling', err.message);
  }

  // TEST 4: Successful Config & Key Recognition
  try {
    const validKey = 'sk-proj-test1234567890abcdefghijklmnopqrstuvwxyz';
    const health = checkOpenAIHealthStatus(validKey, 'gpt-4o-mini');
    assert(health.isConfigured === true && health.maskedKey === 'sk-proj...wxyz', '4. Valid API Key Recognition');
  } catch (err: any) {
    assert(false, '4. Valid API Key Recognition', err.message);
  }

  // TEST 5: Fallback Execution (No API Key)
  try {
    const res = await aiOrchestrator.processUserMessage({
      userQuery: 'How much water should I drink today?',
      userProfile: mockProfile,
      weatherData: mockWeather,
      overrideApiKey: '', // Empty key forces fallback
    });
    assert(res.fallbackUsed === true && res.response.includes('WATER'), '5. Clinical Fallback Engine Execution');
  } catch (err: any) {
    assert(false, '5. Clinical Fallback Engine Execution', err.message);
  }

  // TEST 6: Intent Routing - General Care
  try {
    const intentRes = await intentRouter.classifyIntent('What should I eat in heatwave?', '', 'gpt-4o-mini');
    assert(intentRes.intent === 'general_care' || intentRes.intent === 'weather_climate', '6. Intent Routing - General Care');
  } catch (err: any) {
    assert(false, '6. Intent Routing - General Care', err.message);
  }

  // TEST 7: Intent Routing - Emergency Detection
  try {
    const intentRes = await intentRouter.classifyIntent('I am feeling faint and baby is not moving', '', 'gpt-4o-mini');
    assert(intentRes.intent === 'emergency', '7. Intent Routing - Emergency Detection');
  } catch (err: any) {
    assert(false, '7. Intent Routing - Emergency Detection', err.message);
  }

  // TEST 8: Clinical Safety Layer - Emergency & High-Risk Referral Generation
  try {
    const safetyRes = await safetyLayer.evaluate({
      intent: 'emergency',
      userQuery: 'I am pregnant in 2nd trimester and feeling severe dizziness and faint',
      userProfile: mockProfile,
    });
    assert(
      safetyRes.finalRiskLevel === 'High / Emergency' &&
        safetyRes.requiresReferral === true &&
        safetyRes.referralTicket !== undefined,
      '8. High-Risk Emergency Referral Generation'
    );
  } catch (err: any) {
    assert(false, '8. High-Risk Emergency Referral Generation', err.message);
  }

  // TEST 9: Clinical Safety Layer - Low-Risk Clinical Response
  try {
    const safetyRes = await safetyLayer.evaluate({
      intent: 'general_care',
      userQuery: 'Should I drink ORS water today?',
      userProfile: mockProfile,
    });
    assert(
      safetyRes.finalRiskLevel === 'Low' && safetyRes.requiresReferral === false,
      '9. Low-Risk Response Handling'
    );
  } catch (err: any) {
    assert(false, '9. Low-Risk Response Handling', err.message);
  }

  // TEST 10: Medication Adherence Query
  try {
    const res = await aiOrchestrator.processUserMessage({
      userQuery: 'How do I store iron tablets in 42°C heat?',
      userProfile: mockProfile,
      weatherData: mockWeather,
    });
    assert(res.intent === 'medication_adherence' || res.response.includes('Iron'), '10. Medication Query Handling');
  } catch (err: any) {
    assert(false, '10. Medication Query Handling', err.message);
  }

  // TEST 11: Climate Question Handling
  try {
    const res = await aiOrchestrator.processUserMessage({
      userQuery: 'What is the AQI in New Delhi today?',
      userProfile: mockProfile,
      weatherData: mockWeather,
    });
    assert(res.response.length > 0 && res.intent !== undefined, '11. Climate Question Handling');
  } catch (err: any) {
    assert(false, '11. Climate Question Handling', err.message);
  }

  // TEST 12: End-to-End High Risk Flow via AI Orchestrator
  try {
    const res = await aiOrchestrator.processUserMessage({
      userQuery: 'I have high fever 103°F and severe abdominal cramping',
      userProfile: mockProfile,
      weatherData: mockWeather,
    });
    assert(
      res.riskLevel === 'High / Emergency' && res.requiresReferral === true && res.referralTicket !== undefined,
      '12. End-to-End High-Risk Orchestration Pipeline'
    );
  } catch (err: any) {
    assert(false, '12. End-to-End High-Risk Orchestration Pipeline', err.message);
  }

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests();
