/**
 * Dry-run harness for the Meta webhook endpoint.
 *
 *   MESSAGE_PROVIDER=mock npx tsx api/__tests__/webhook.dryrun.ts
 *
 * Exercises the handshake, HMAC signature validation (both directions), and a
 * full inbound-message round trip through the router — without contacting Meta.
 */

import crypto from 'node:crypto';
import handler from '../webhook';

const VERIFY_TOKEN = 'test_verify_token_123';
const APP_SECRET = 'test_app_secret_abc';

process.env.META_WHATSAPP_VERIFY_TOKEN = VERIFY_TOKEN;
process.env.META_WHATSAPP_APP_SECRET = APP_SECRET;

const BASE = 'https://dayli.test/api/webhook';

let passed = 0;
let failed = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  console.log(`${ok ? '  ✅' : '  ❌'} ${label}${ok ? '' : `  → got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`}`);
  ok ? passed++ : failed++;
}

function sign(body: string): string {
  return 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(body).digest('hex');
}

const inboundTextPayload = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: 'WABA_ID',
      changes: [
        {
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '15550001111', phone_number_id: '1279130000000' },
            contacts: [{ profile: { name: 'Test Patient' }, wa_id: '919876543210' }],
            messages: [
              {
                from: '919876543210',
                id: 'wamid.TEST_MESSAGE_001',
                timestamp: String(Math.floor(Date.now() / 1000)),
                type: 'text',
                text: { body: 'hi' },
              },
            ],
          },
        },
      ],
    },
  ],
};

async function run() {
  console.log('\n── 1. GET handshake ────────────────────────────────────');

  const okHandshake = await handler(
    new Request(`${BASE}?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=CHALLENGE_42`)
  );
  check('valid token → 200', okHandshake.status, 200);
  check('echoes raw challenge', await okHandshake.text(), 'CHALLENGE_42');

  const badHandshake = await handler(
    new Request(`${BASE}?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=CHALLENGE_42`)
  );
  check('wrong token → 403', badHandshake.status, 403);

  console.log('\n── 2. HMAC signature validation ────────────────────────');

  const body = JSON.stringify(inboundTextPayload);

  const badSig = await handler(
    new Request(BASE, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-hub-signature-256': 'sha256=deadbeef' },
      body,
    })
  );
  check('forged signature → 401', badSig.status, 401);

  const noSig = await handler(
    new Request(BASE, { method: 'POST', headers: { 'content-type': 'application/json' }, body })
  );
  check('missing signature → 401', noSig.status, 401);

  console.log('\n── 3. Full inbound round trip (valid signature) ────────');

  const goodSig = await handler(
    new Request(BASE, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-hub-signature-256': sign(body) },
      body,
    })
  );
  check('valid signature → 200', goodSig.status, 200);
  const result: any = await goodSig.json();
  check('message processed', result.processed, true);
  console.log(`     reply provider: ${result.sendResult?.provider}`);
  console.log(`     send success:   ${result.sendResult?.success}`);

  console.log('\n── 4. Idempotency (Meta redelivery of same message_id) ──');

  const replay = await handler(
    new Request(BASE, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-hub-signature-256': sign(body) },
      body,
    })
  );
  const replayResult: any = await replay.json();
  check('duplicate suppressed', replayResult.processed, false);
  check('still acks with 200', replay.status, 200);

  console.log('\n── 5. Method guard ─────────────────────────────────────');
  const del = await handler(new Request(BASE, { method: 'DELETE' }));
  check('DELETE → 405', del.status, 405);

  console.log(`\n${failed === 0 ? '✅' : '❌'} ${passed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
}

run();
