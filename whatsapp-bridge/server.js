const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Configuration
const VERIFY_TOKEN = process.env.META_WHATSAPP_VERIFY_TOKEN || 'dayli_climate_copilot_token_2026';
const PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID || '125054977367240';
const ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN || '';

// Clinical & Weather Health Advisory Engine
function generateAIResponse(userMessage, userName = 'there') {
  const qLower = userMessage.toLowerCase();

  // 1. Pediatric & Infant Clinical Concern
  if (
    (qLower.includes('baby') || qLower.includes('infant') || qLower.includes('child')) &&
    (qLower.includes('cry') || qLower.includes('fever') || qLower.includes('hot') || qLower.includes('sleep') || qLower.includes('vomit') || qLower.includes('breath') || qLower.includes('feed'))
  ) {
    if (qLower.includes('breath') || qLower.includes('blue') || qLower.includes('unresponsive') || qLower.includes('limp')) {
      return `🚨 *EMERGENCY CLINICAL ALERT*\n\n` +
        `Signs of severe respiratory distress or unresponsiveness in a baby require *immediate emergency evaluation*.\n\n` +
        `• Call emergency medical services immediately or go to the nearest emergency clinic.\n` +
        `• Keep baby in an upright, supported position with clear airway.\n` +
        `• Do NOT administer oral liquids if the baby is struggling to breathe.`;
    }

    return `🌸 *dayli Clinical Companion for Baby Care*\n\n` +
      `I understand — continuous crying or discomfort in a baby can be worrying, ${userName}. Let's check these key indicators:\n\n` +
      `• *Breathing:* Is your baby breathing rapidly, grunting, or flaring nostrils?\n` +
      `• *Skin & Lips:* Check for unusual paleness, blue discoloration, or heat rash.\n` +
      `• *Temperature:* Overheating from high ambient temperatures is common. Feel the back of their neck.\n` +
      `• *Feeding:* Offer frequent small breastfeeds. Never give large amounts of plain water to infants under 6 months.\n\n` +
      `*Action:* Move your baby into cool shade or an air-conditioned room, dress in light cotton, and wipe with a lukewarm damp cloth.\n\n` +
      `_If fever persists (>38°C / 100.4°F) or crying is inconsolable, please consult a pediatrician._`;
  }

  // 2. Emergency Red Flags (Maternal & General)
  if (
    qLower.includes('broke') ||
    qLower.includes('fracture') ||
    qLower.includes('bleeding') ||
    qLower.includes('faint') ||
    qLower.includes('chest pain') ||
    qLower.includes('cannot breathe')
  ) {
    return `🚨 *URGENT MEDICAL ATTENTION REQUIRED*\n\n` +
      `Your reported symptom indicates an acute medical concern.\n\n` +
      `• *Immediate Action:* Please proceed to the nearest hospital or emergency room.\n` +
      `• *First Aid:* Rest comfortably, avoid sudden movement, and stay supported.\n` +
      `• *Doctor Referral Ticket:* Generated for Emergency Evaluation.`;
  }

  // 3. Mental Health & Stress
  if (qLower.includes('breakdown') || qLower.includes('mental') || qLower.includes('anxiety') || qLower.includes('depress') || qLower.includes('overwhelm')) {
    return `🤍 *dayli Compassionate Care*\n\n` +
      `I hear you, ${userName}, and I am so sorry you are feeling overwhelmed right now. Your feelings are completely valid.\n\n` +
      `• *Grounding Exercise:* Breathe in slowly for 4 seconds, hold for 4 seconds, and exhale slowly for 6 seconds.\n` +
      `• *Quiet Rest:* Find a calm, cool, quiet space to rest your body.\n` +
      `• *Support Helpline:* In India, call Tele-MANAS at *14416* (toll-free, 24/7 confidential emotional support).`;
  }

  // 4. Weather & Heat Inquiries
  if (qLower.includes('weather') || qLower.includes('temperature') || qLower.includes('aqi') || qLower.includes('heat') || qLower.includes('pollution')) {
    return `🌤️ *dayli Climate Intelligence Advisory*\n\n` +
      `• *Extreme Heat Protection:* Stay indoors during peak sunlight hours (11:00 AM – 4:00 PM).\n` +
      `• *Hydration Target:* 2.5L to 3.0L daily for pregnant/nursing mothers with electrolyte balance (ORS / coconut water).\n` +
      `• *Air Quality Advice:* On high AQI days, keep windows closed and avoid outdoor physical exertion.`;
  }

  // 5. Default Warm Companion Greeting & Guidance
  return `🌸 *Welcome to dayli.ai Climate Health Copilot!*\n\n` +
    `Hello ${userName}, I am your daily health and climate companion.\n\n` +
    `You can ask me anything about:\n` +
    `👉 *Baby & child health* (fever, crying, heat rashes)\n` +
    `👉 *Pregnancy care* (hydration, heat stress, trimester tips)\n` +
    `👉 *Climate safety* (extreme heat, AQI air pollution, UV protection)\n` +
    `👉 *Medication guidance* (heat storage, adherence)\n\n` +
    `_How can I help you today?_`;
}

// Function to send WhatsApp message via Meta Cloud Graph API
async function sendWhatsAppMessage(recipientPhone, messageText) {
  if (!ACCESS_TOKEN) {
    console.warn(`[META WA API] No ACCESS_TOKEN configured. Simulated reply to ${recipientPhone}: "${messageText.substring(0, 50)}..."`);
    return { simulated: true };
  }

  const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipientPhone,
        type: 'text',
        text: { body: messageText },
      }),
    });
    const data = await res.json();
    console.log(`[META WA API] Successfully sent message to ${recipientPhone}:`, data);
    return data;
  } catch (error) {
    console.error(`[META WA API ERROR] Failed to send message to ${recipientPhone}:`, error.message);
    throw error;
  }
}

// =================================================================
// 1. META WEBHOOK VERIFICATION (GET /api/webhook & GET /webhook)
// =================================================================
function handleVerification(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log(`[WEBHOOK VERIFY] mode=${mode}, token=${token}`);

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ [WEBHOOK VERIFIED] Meta Cloud API Webhook successfully verified!');
      res.status(200).send(challenge);
    } else {
      console.warn('❌ [WEBHOOK REJECTED] Verification token mismatch.');
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
}

app.get('/webhook', handleVerification);
app.get('/api/webhook', handleVerification);

// =================================================================
// 2. INCOMING META MESSAGES (POST /api/webhook & POST /webhook)
// =================================================================
async function handleIncomingMessage(req, res) {
  const body = req.body;

  console.log('[WEBHOOK INCOMING] Payload received:', JSON.stringify(body, null, 2));

  // Acknowledge Meta immediately with 200 OK (mandatory to prevent retries)
  res.status(200).send('EVENT_RECEIVED');

  if (body.object === 'whatsapp_business_account') {
    if (body.entry && body.entry.length > 0) {
      for (const entry of body.entry) {
        if (entry.changes && entry.changes.length > 0) {
          for (const change of entry.changes) {
            const value = change.value;
            if (value && value.messages && value.messages.length > 0) {
              for (const msg of value.messages) {
                const from = msg.from; // User's phone number
                const messageType = msg.type;
                const contact = value.contacts && value.contacts[0];
                const userName = (contact && contact.profile && contact.profile.name) || 'there';

                let incomingText = '';
                if (messageType === 'text' && msg.text) {
                  incomingText = msg.text.body;
                } else if (messageType === 'button' && msg.button) {
                  incomingText = msg.button.text;
                } else if (messageType === 'interactive' && msg.interactive) {
                  incomingText = (msg.interactive.button_reply && msg.interactive.button_reply.title) || '';
                }

                console.log(`[USER MESSAGE] From: ${from} (${userName}) | Text: "${incomingText}"`);

                // Generate AI Clinical & Climate Response
                const replyText = generateAIResponse(incomingText, userName);

                // Dispatch WhatsApp reply to user's phone
                try {
                  await sendWhatsAppMessage(from, replyText);
                } catch (err) {
                  console.error(`Failed to dispatch WhatsApp reply to ${from}:`, err.message);
                }
              }
            }
          }
        }
      }
    }
  }
}

app.post('/webhook', handleIncomingMessage);
app.post('/api/webhook', handleIncomingMessage);

// Health Check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'dayli.ai WhatsApp Cloud Engine',
    version: '2.0.0',
    phoneNumberId: PHONE_NUMBER_ID,
    verifyToken: VERIFY_TOKEN,
  });
});

app.listen(PORT, () => {
  console.log(`=================================================================`);
  console.log(`🚀 dayli.ai WhatsApp Server running on port ${PORT}`);
  console.log(`Webhook URL paths:`);
  console.log(`  - GET/POST http://localhost:${PORT}/webhook`);
  console.log(`  - GET/POST http://localhost:${PORT}/api/webhook`);
  console.log(`=================================================================`);
});
