import { whatsAppMessageNormalizer } from '../normalizer';
import { idempotencyEngine } from '../idempotencyEngine';
import { webhookHandler } from '../webhookHandler';
import { whatsAppMessageRouter } from '../messageRouter';
import { mockWhatsAppProvider } from '../providers/MockWhatsAppProvider';
import { metaWhatsAppProvider } from '../providers/MetaWhatsAppProvider';
import { sessionManager } from '../../session/sessionManager';

async function runWhatsAppIntegrationTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING DAYLI.AI META WHATSAPP INTEGRATION TESTS');
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

  // TEST 1: Webhook Handshake GET Verification
  try {
    const res = webhookHandler.verifyWebhook({
      mode: 'subscribe',
      verifyToken: 'dayli_ai_webhook_verify_token_2026',
      challenge: '987654321',
    });
    assert(res.isValid === true && res.challenge === '987654321', '1. Webhook Handshake GET Verification');
  } catch (err: any) {
    assert(false, '1. Webhook Handshake GET Verification', err.message);
  }

  // TEST 2: Incoming Text Message Normalization
  try {
    const rawPayload = {
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ profile: { name: 'Ananya' }, wa_id: '919876543210' }],
                messages: [
                  {
                    from: '919876543210',
                    id: 'wamid.test_text_1',
                    timestamp: '1700000000',
                    type: 'text',
                    text: { body: 'What should I eat in heatwave?' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const norm = whatsAppMessageNormalizer.normalizeMetaWebhook(rawPayload);
    assert(
      norm !== null && norm.type === 'text' && norm.text === 'What should I eat in heatwave?' && norm.user_name === 'Ananya',
      '2. Incoming Text Message Normalization'
    );
  } catch (err: any) {
    assert(false, '2. Incoming Text Message Normalization', err.message);
  }

  // TEST 3: Button Reply Interactive Message Normalization
  try {
    const rawPayload = {
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ profile: { name: 'Ananya' }, wa_id: '919876543210' }],
                messages: [
                  {
                    from: '919876543210',
                    id: 'wamid.test_btn_1',
                    timestamp: '1700000000',
                    type: 'interactive',
                    interactive: {
                      type: 'button_reply',
                      button_reply: { id: 'btn_opt_triage', title: '🚨 Clinical Triage' },
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const norm = whatsAppMessageNormalizer.normalizeMetaWebhook(rawPayload);
    assert(
      norm !== null && norm.type === 'interactive_reply' && norm.button_id === 'btn_opt_triage',
      '3. Button Reply Interactive Normalization'
    );
  } catch (err: any) {
    assert(false, '3. Button Reply Interactive Normalization', err.message);
  }

  // TEST 4: Location Message Normalization
  try {
    const rawPayload = {
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ profile: { name: 'Ananya' }, wa_id: '919876543210' }],
                messages: [
                  {
                    from: '919876543210',
                    id: 'wamid.test_loc_1',
                    timestamp: '1700000000',
                    type: 'location',
                    location: { latitude: 28.6139, longitude: 77.209, name: 'Delhi Central GPS' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const norm = whatsAppMessageNormalizer.normalizeMetaWebhook(rawPayload);
    assert(
      norm !== null && norm.type === 'location' && norm.location?.latitude === 28.6139,
      '4. Location Message Parsing & Normalization'
    );
  } catch (err: any) {
    assert(false, '4. Location Message Parsing & Normalization', err.message);
  }

  // TEST 5: Idempotency Engine Duplicate Detection
  try {
    const msgId = 'wamid.duplicate_check_99';
    const firstCheck = idempotencyEngine.isDuplicate(msgId);
    const secondCheck = idempotencyEngine.isDuplicate(msgId);
    assert(firstCheck === false && secondCheck === true, '5. Idempotency Engine Duplicate Detection');
  } catch (err: any) {
    assert(false, '5. Idempotency Engine Duplicate Detection', err.message);
  }

  // TEST 6: Malformed Webhook Payload Handling
  try {
    const norm = whatsAppMessageNormalizer.normalizeMetaWebhook({ malformed: true });
    assert(norm === null, '6. Malformed Webhook Payload Handling');
  } catch (err: any) {
    assert(false, '6. Malformed Webhook Payload Handling', err.message);
  }

  // TEST 7: Mock Provider Message Execution
  try {
    const res = await mockWhatsAppProvider.sendTextMessage('+919876543210', 'Test Mock Outbound');
    assert(res.success === true && res.provider === 'mock', '7. Mock Provider Outbound Messaging');
  } catch (err: any) {
    assert(false, '7. Mock Provider Outbound Messaging', err.message);
  }

  // TEST 8: Meta Provider Credential Missing Error Handling
  try {
    const res = await metaWhatsAppProvider.sendTextMessage('+919876543210', 'Test Meta Outbound');
    assert(res.success === false && res.error !== undefined, '8. Meta Provider Missing Credentials Safety Check');
  } catch (err: any) {
    assert(false, '8. Meta Provider Missing Credentials Safety Check', err.message);
  }

  // TEST 9: End-to-End Inbound Message Pipeline via Router
  try {
    const rawPayload = {
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ profile: { name: 'Ananya Sharma' }, wa_id: '919876543210' }],
                messages: [
                  {
                    from: '919876543210',
                    id: `wamid.e2e_${Date.now()}`,
                    timestamp: `${Math.floor(Date.now() / 1000)}`,
                    type: 'text',
                    text: { body: 'How do I protect my 2nd trimester baby in 42°C heat?' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const routeRes = await whatsAppMessageRouter.routeIncomingMessage(rawPayload, true);
    assert(
      routeRes.processed === true &&
        routeRes.sendResult?.success === true &&
        sessionManager.getSession('+919876543210').recentMessages.length > 0,
      '9. Complete End-to-End Webhook Message Pipeline'
    );
  } catch (err: any) {
    assert(false, '9. Complete End-to-End Webhook Message Pipeline', err.message);
  }

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runWhatsAppIntegrationTests();
