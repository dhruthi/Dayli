// dayli.ai - WhatsApp Integration Bridge
const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Application Connectivity States
let clientStatus = 'initializing';
let activeQrCodeText = '';

// Initialize WhatsApp Web client using LocalAuth to persist session credentials
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth' // stores session files locally
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

// =================================================================
// WHATSAPP EVENT LISTENERS
// =================================================================

// 1. Generate QR Code for Mobile Linkage
client.on('qr', (qr) => {
    clientStatus = 'qr_ready';
    activeQrCodeText = qr;
    
    console.clear();
    console.log('=================================================================');
    console.log('📲 LINK WHATSAPP: SCAN THE QR CODE BELOW');
    console.log('Open WhatsApp on your phone -> Settings -> Linked Devices -> Link a Device');
    console.log('=================================================================');
    
    // Render QR Code in Console Terminal
    qrcode.generate(qr, { small: true });
});

// 2. Authentication Success
client.on('authenticated', () => {
    clientStatus = 'authenticated';
    activeQrCodeText = '';
    console.log('🔑 Authentication successful! Syncing chats...');
});

// 3. Client is Fully Synchronized and Ready to Message
client.on('ready', () => {
    clientStatus = 'ready';
    console.log('=================================================================');
    console.log('✅ dayli WhatsApp Bridge is ACTIVE and READY!');
    console.log(`Server listening on REST endpoints on port ${PORT}`);
    console.log('=================================================================');
});

client.on('auth_failure', (msg) => {
    clientStatus = 'auth_failed';
    console.error('❌ Authentication failed:', msg);
});

client.on('disconnected', (reason) => {
    clientStatus = 'disconnected';
    console.warn('⚠️ WhatsApp client was disconnected:', reason);
    // Destroy and re-initialize
    client.initialize().catch(err => console.error('Failed to restart client:', err));
});

// =================================================================
// CHATBOT KEYWORD PARSER (Vetted health advisory copy)
// =================================================================
client.on('message', async (msg) => {
    // Only respond to individual chats (not group chats)
    if (!msg.from.endsWith('@c.us')) return;

    const incomingText = msg.body.trim().toLowerCase();
    
    console.log(`[INCOMING] Message from ${msg.from}: "${msg.body}"`);

    // Standard clinical guides map
    const guides = {
        heat: `🥵 *dayli Extreme Heat Safety Guide*

• *Pregnant Women*: Extreme heat increases risk of dehydration, preterm birth, and gestational hypertension. If feels-like is >32°C (90°F), restrict outdoor exposure and drink at least 3 Liters of water daily.
• *Children*: Babies cannot regulate heat effectively. Never leave children in parked vehicles, dress in lightweight clothing, and offer breastmilk/water every 20 minutes.`,

        aqi: `💨 *dayli Air Quality Protection Guide*

• *Mothers*: Particulates (PM2.5) can cross the placenta barrier, raising risk of low birth weight. Keep windows closed when AQI > 100 and run indoor HEPA filters.
• *Children*: Child lungs are still developing. Suspend outdoor play on highly polluted days. Do NOT mask infants under 2 years (suffocation danger).`,

        uv: `☀️ *dayli UV Radiation Guide*

• *Pregnancy*: Fluctuating hormones raise melasma risk (dark facial skin spots) under UV rays. Use SPF 30+ physical block (zinc oxide).
• *Infants*: Keep babies under 6 months completely in shade. Use stroller canopies. For toddlers, apply broad-spectrum sunscreen every 2 hours.`,

        hydration: `💧 *dayli Hydration Nudges*

• *Pregnancy*: Dehydration triggers oxytocin, causing premature labor contractions. Drink a minimum of 2.7 to 3.0 Liters (12 cups) daily.
• *Infants*: Under 6 months, only offer breastmilk/formula (no water). Older kids should be offered water frequently during play.`,

        symptoms: `🚨 *Emergency Red Flag Signs*

Seek immediate emergency medical care if you witness:
• *Pregnant Mother*: Uterine contractions, severe headache/dizziness, chest pain, or sudden decrease in baby's movement.
• *Infant/Child*: Extreme lethargy (unable to wake up), rapid or grunting breaths, or dry mouth and crying without tears (severe dehydration).`
    };

    // Keyword logic router
    if (incomingText === 'start' || incomingText === 'hello' || incomingText === 'hi') {
        const greet = `🌸 *Welcome to dayli.ai!* 👶
Your AI-powered Climate Health Copilot on WhatsApp.

I am here to protect you, your pregnancy, and your children from extreme heatwaves, UV, and air pollution.

Reply with one of these keywords for guidance:
👉 *heat* (temperature guides)
👉 *aqi* (pollution & smoke guides)
👉 *uv* (sun exposure guides)
👉 *hydration* (water intake guidelines)
👉 *symptoms* (emergency warning signs)

I will also push warnings automatically if local climate variables spike in your location.`;
        
        await msg.reply(greet);
    } else if (incomingText.includes('heat') || incomingText.includes('hot') || incomingText.includes('temperature')) {
        await msg.reply(guides.heat);
    } else if (incomingText.includes('aqi') || incomingText.includes('air') || incomingText.includes('smoke') || incomingText.includes('pollution')) {
        await msg.reply(guides.aqi);
    } else if (incomingText.includes('uv') || incomingText.includes('sun') || incomingText.includes('skin')) {
        await msg.reply(guides.uv);
    } else if (incomingText.includes('water') || incomingText.includes('drink') || incomingText.includes('hydration') || incomingText.includes('dehydration')) {
        await msg.reply(guides.hydration);
    } else if (incomingText.includes('symptom') || incomingText.includes('signs') || incomingText.includes('red flag') || incomingText.includes('emergency')) {
        await msg.reply(guides.symptoms);
    }
});

// Start Client
client.initialize().catch(err => console.error('Failed to initialize client:', err));

// =================================================================
// HTTP REST ENDPOINTS (For Website Integration)
// =================================================================

// Helper: Format number into WhatsApp format
function formatWhatsAppNumber(phone) {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Add USA prefix if missing (assuming default US, but customize as needed)
    if (cleaned.length === 10) {
        cleaned = '1' + cleaned;
    }
    
    // Check if it already has @c.us suffix
    if (!cleaned.endsWith('@c.us')) {
        cleaned += '@c.us';
    }
    return cleaned;
}

// 1. Get Authentication Connectivity Status
app.get('/status', (req, res) => {
    res.json({
        status: clientStatus,
        qrCodeText: activeQrCodeText,
        instructions: clientStatus === 'qr_ready' ? 'Scan the QR code printed in the terminal or use qrCodeText to display it in your app.' : 'Client is either initializing or fully ready.'
    });
});

// 2. Post Alert Message Trigger
app.post('/send-message', async (req, res) => {
    const { to, message } = req.body;
    
    if (clientStatus !== 'ready') {
        return res.status(503).json({ error: 'WhatsApp client is not authenticated or connected yet.' });
    }
    
    if (!to || !message) {
        return res.status(400).json({ error: 'Parameters "to" and "message" are required.' });
    }
    
    try {
        const formattedRecipient = formatWhatsAppNumber(to);
        
        console.log(`[API SEND] Sending message to ${formattedRecipient}: "${message.substring(0, 30)}..."`);
        
        await client.sendMessage(formattedRecipient, message);
        res.json({ success: true, recipient: formattedRecipient, timestamp: new Date() });
        
    } catch (err) {
        console.error('Failed to dispatch message:', err);
        res.status(500).json({ error: 'Failed to send WhatsApp message.', details: err.message });
    }
});

// 3. Post Structured Climate Alert
app.post('/send-alert', async (req, res) => {
    const { to, city, feelsLike, aqi, uvIndex } = req.body;
    
    if (clientStatus !== 'ready') {
        return res.status(503).json({ error: 'WhatsApp client is not active yet.' });
    }
    
    if (!to || !city || !feelsLike) {
        return res.status(400).json({ error: 'Parameters "to", "city", and "feelsLike" are required.' });
    }
    
    try {
        const formattedRecipient = formatWhatsAppNumber(to);
        
        // Build beautiful text alert matching dayli templates
        const alertBody = `🚨 *dayli Climate Warning Alert* for *${city}*

• Apparent Temp: *${feelsLike}°C* (Feels like)
• Air Quality index: *${aqi || 'N/A'}*
• UV Sun index: *${uvIndex || 'N/A'}*

⚠️ *Health Recommendation*:
Pregnant mothers should restrict outdoor travel, increase hydration (aim for 3L+), and keep infants inside air-conditioned rooms.

*Reply "help" for specific clinical action checklists.*`;

        console.log(`[API ALERT] Sending structured alert to ${formattedRecipient} in ${city}`);
        
        await client.sendMessage(formattedRecipient, alertBody);
        res.json({ success: true, recipient: formattedRecipient, alertType: 'climate-warning', timestamp: new Date() });
        
    } catch (err) {
        console.error('Failed to dispatch structured alert:', err);
        res.status(500).json({ error: 'Failed to send alert.', details: err.message });
    }
});

// Expose Port
app.listen(PORT, () => {
    console.log(`=================================================================`);
    console.log(`🚀 Node.js WhatsApp Bridge is running on http://localhost:${PORT}`);
    console.log(`Endpoints available:`);
    console.log(`  - GET  http://localhost:${PORT}/status`);
    console.log(`  - POST http://localhost:${PORT}/send-message`);
    console.log(`  - POST http://localhost:${PORT}/send-alert`);
    console.log(`=================================================================`);
});
