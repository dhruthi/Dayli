import { sharedApiRouter } from '../sharedApiRouter';
import { authService } from '../authService';
import { securityConfig } from '../securityConfig';

async function runSharedApiTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING DAYLI.AI SHARED REST API BACKEND TESTS');
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

  // TEST 1: Health Check Endpoint (GET /api/health)
  try {
    const res = await sharedApiRouter.handleHealthCheck();
    assert(
      res.success === true && res.data.status === 'UP' && res.data.service === 'dayli-ai-shared-api-backend',
      '1. Health Check Endpoint (GET /api/health)'
    );
  } catch (err: any) {
    assert(false, '1. Health Check Endpoint (GET /api/health)', err.message);
  }

  // TEST 2: Universal Chat API - Website Channel Request
  try {
    const res = await sharedApiRouter.handleChatMessage({
      session_id: 'sess_web_test_1',
      message: 'What should I eat in 42°C heat in 2nd trimester?',
      channel: 'web',
      user_name: 'Ananya (Web)',
    });
    assert(
      res.success === true &&
        res.data?.metadata.channel === 'web' &&
        res.data?.intent !== undefined &&
        res.data?.message.length > 0,
      '2. Universal Chat API - Website Channel'
    );
  } catch (err: any) {
    assert(false, '2. Universal Chat API - Website Channel', err.message);
  }

  // TEST 3: Universal Chat API - WhatsApp Channel Request
  try {
    const res = await sharedApiRouter.handleChatMessage({
      session_id: 'sess_wa_test_1',
      message: 'What should I eat in 42°C heat in 2nd trimester?',
      channel: 'whatsapp',
      phone_number: '+919876543210',
    });
    assert(
      res.success === true && res.data?.metadata.channel === 'whatsapp',
      '3. Universal Chat API - WhatsApp Channel'
    );
  } catch (err: any) {
    assert(false, '3. Universal Chat API - WhatsApp Channel', err.message);
  }

  // TEST 4: Universal Chat API - Simulator Channel Request
  try {
    const res = await sharedApiRouter.handleChatMessage({
      session_id: 'sess_sim_test_1',
      message: 'What should I eat in 42°C heat in 2nd trimester?',
      channel: 'simulator',
    });
    assert(
      res.success === true && res.data?.metadata.channel === 'simulator',
      '4. Universal Chat API - Simulator Channel'
    );
  } catch (err: any) {
    assert(false, '4. Universal Chat API - Simulator Channel', err.message);
  }

  // TEST 5: Cross-Channel Consistency Verification
  try {
    const query = 'How much water should I drink in 40°C heat?';
    const webRes = await sharedApiRouter.handleChatMessage({ session_id: 's1', message: query, channel: 'web' });
    const simRes = await sharedApiRouter.handleChatMessage({ session_id: 's2', message: query, channel: 'simulator' });

    assert(
      webRes.data?.intent === simRes.data?.intent && webRes.data?.risk_level === simRes.data?.risk_level,
      '5. Cross-Channel Output Consistency (Web vs Simulator)'
    );
  } catch (err: any) {
    assert(false, '5. Cross-Channel Output Consistency (Web vs Simulator)', err.message);
  }

  // TEST 6: Web Dashboard Summary Endpoint (GET /api/dashboard/summary)
  try {
    const res = await sharedApiRouter.handleGetDashboardSummary('+919876543210');
    assert(
      res.success === true &&
        res.data?.user.name !== undefined &&
        res.data?.current_climate.temperature_c !== undefined &&
        res.data?.hydration_target.target_liters !== undefined,
      '6. Web Dashboard Overview Summary Endpoint'
    );
  } catch (err: any) {
    assert(false, '6. Web Dashboard Overview Summary Endpoint', err.message);
  }

  // TEST 7: Authentication & Role Access Control
  try {
    const token = authService.issueToken('usr_123', 'admin');
    const unauthorizedRes = await sharedApiRouter.handleAdminStats('invalid_token');
    const authorizedRes = await sharedApiRouter.handleAdminStats(token);

    assert(
      unauthorizedRes.success === false && authorizedRes.success === true,
      '7. Authentication & Admin Role Access Control'
    );
  } catch (err: any) {
    assert(false, '7. Authentication & Admin Role Access Control', err.message);
  }

  // TEST 8: CORS Security Check
  try {
    const badOriginRes = await sharedApiRouter.handleChatMessage(
      { session_id: 's', message: 'Hi', channel: 'web' },
      'http://malicious-site.com'
    );
    assert(badOriginRes.success === false && badOriginRes.error?.code === 'FORBIDDEN_CORS', '8. CORS Security Origin Rejection');
  } catch (err: any) {
    assert(false, '8. CORS Security Origin Rejection', err.message);
  }

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSharedApiTests();
