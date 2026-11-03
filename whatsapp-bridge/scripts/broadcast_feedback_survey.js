#!/usr/bin/env node
/**
 * ==============================================================================
 * Dayli AI — Broadcast Feedback Survey to All Active Users
 * ==============================================================================
 * Dispatches the 3-question MCQ Feedback Survey invite to all active consented
 * WhatsApp users currently registered in the Redis session store.
 *
 * Usage:
 *   node whatsapp-bridge/scripts/broadcast_feedback_survey.js
 *   node whatsapp-bridge/scripts/broadcast_feedback_survey.js --dry-run
 *   node whatsapp-bridge/scripts/broadcast_feedback_survey.js --wa-id 918008903857
 */

import 'dotenv/config';
import { Store } from '../lib/store.js';
import { CloudApiClient } from '../lib/cloudApi.js';
import { closeRedis } from '../lib/redis.js';
import { sendFeedbackSurveyToAllUsers, sendFeedbackSurveyToUser } from '../lib/survey.js';

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const waIdArgIndex = args.indexOf('--wa-id');
  const targetWaId = waIdArgIndex !== -1 ? args[waIdArgIndex + 1] : null;

  console.log('================================================================');
  console.log('🌸 Dayli AI — Feedback Survey Broadcast Runner');
  console.log('================================================================');
  if (dryRun) console.log('🔍 MODE: DRY-RUN (No WhatsApp messages will be sent)');

  const store = await Store.create();
  const cloudApi = new CloudApiClient({
    accessToken: process.env.META_WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.META_WHATSAPP_PHONE_NUMBER_ID,
    logger: console,
  });

  if (!cloudApi.configured && !dryRun) {
    console.error('❌ Error: META_WHATSAPP_ACCESS_TOKEN and META_WHATSAPP_PHONE_NUMBER_ID must be set.');
    await closeRedis();
    process.exit(1);
  }

  const activeUsers = await store.getActiveUsers();
  console.log(`📋 Found ${activeUsers.length} active consented user(s) in Redis store.`);

  if (targetWaId) {
    console.log(`🎯 Targeting specific user: ${targetWaId}`);
    const session = await store.getSession(targetWaId);
    console.log(`- Consent granted: ${session?.consent?.granted}`);
    console.log(`- Preferred locale: ${session?.profile?.locale || 'en'}`);
    console.log(`- Customer window open: ${Store.isWindowOpen(session)}`);

    if (dryRun) {
      console.log('✅ Dry-run complete for target user.');
      await closeRedis();
      return;
    }

    const res = await sendFeedbackSurveyToUser({
      waId: targetWaId,
      store,
      cloudApi,
      force: true,
    });
    console.log('Result:', res);
  } else {
    console.log(`🚀 Broadcasting survey invite to all ${activeUsers.length} active users...`);

    for (const waId of activeUsers) {
      const session = await store.getSession(waId);
      const isWindowOpen = Store.isWindowOpen(session);
      const locale = session?.profile?.locale || 'en';
      console.log(`• Recipient: +${waId} | Locale: ${locale} | 24h Window: ${isWindowOpen ? 'OPEN ✅' : 'CLOSED ⚠️'}`);

      if (dryRun) continue;
    }

    if (dryRun) {
      console.log('✅ Dry-run broadcast simulation complete.');
      await closeRedis();
      return;
    }

    const broadcastResult = await sendFeedbackSurveyToAllUsers({
      store,
      cloudApi,
      force: true,
    });

    console.log('================================================================');
    console.log(`🎉 Broadcast Finished:`);
    console.log(`   Total Users : ${broadcastResult.totalUsers}`);
    console.log(`   Sent        : ${broadcastResult.sentCount}`);
    console.log(`   Failed      : ${broadcastResult.failedCount}`);
    console.log('Detailed outcomes:');
    for (const r of broadcastResult.results) {
      console.log(`   - +${r.waId}: ${r.success ? 'Delivered successfully ✅' : `Failed ❌ (${r.error})`}`);
    }
    console.log('================================================================');
  }

  await closeRedis();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Fatal error in broadcast runner:', err);
  await closeRedis().catch(() => {});
  process.exit(1);
});
