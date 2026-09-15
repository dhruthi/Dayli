import { sharedApiRouter } from '../../api/sharedApiRouter';

async function runQueries() {
  console.log('\n--- TESTING EXACT USER MESSAGES ---\n');

  const queries = [
    'My baby is crying non stop',
    'My baby is crying non stop and is having trouble breathing',
    'What is the weather in New Delhi?',
    'How can I protect my baby from the heat?',
  ];

  for (const q of queries) {
    console.log(`\n====================================================`);
    console.log(`QUERY: "${q}"`);
    console.log(`====================================================`);
    const res = await sharedApiRouter.handleChatMessage({
      session_id: `sess_test_${Date.now()}`,
      message: q,
      channel: 'simulator',
      user_name: 'Ananya Sharma',
    });

    if (res.success && res.data) {
      console.log(`INTENT: ${res.data.intent}`);
      console.log(`RISK LEVEL: ${res.data.risk_level}`);
      console.log(`RESPONSE:\n${res.data.message}\n`);
    } else {
      console.error(`ERROR: ${res.error?.message}`);
    }
  }
}

runQueries();
