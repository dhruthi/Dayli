# dayli.ai — WhatsApp Integration Bridge (Node.js)

This is a functional, standalone backend bridge that connects a real WhatsApp account (using a QR scan) to your website. It allows you to run an automated chatbot that answers questions on WhatsApp and exposes a local REST API so your website can send real-time alerts.

---

## 🛠️ Requirements & Setup

### 1. Installation
Navigate to this directory in your terminal and install the dependencies:
```bash
cd whatsapp-bridge
npm install
```

### 2. Execution
Start the integration bridge server:
```bash
npm start
```

### 3. Scan QR Code
1. Once the server initializes, a **QR Code** will be rendered directly inside your terminal console.
2. Open WhatsApp on your mobile phone.
3. Go to **Settings** -> **Linked Devices** -> **Link a Device**.
4. Scan the QR code in the terminal.
5. Once scanned, the console will print: `✅ dayli WhatsApp Bridge is ACTIVE and READY!`

---

## 📡 REST API Documentation

Once ready, the server listens on **`http://localhost:3000`** with the following endpoints:

### 1. Check Connectivity
- **Endpoint**: `GET http://localhost:3000/status`
- **Response**:
```json
{
  "status": "ready", // ready, qr_ready, initializing, authenticated
  "qrCodeText": "",
  "instructions": "Client is either initializing or fully ready."
}
```

### 2. Send Custom Text Message
- **Endpoint**: `POST http://localhost:3000/send-message`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "to": "15551234567", // recipient phone number (with country code, signs like +, - or space are auto-removed)
  "message": "Hello from dayli.ai! Remember to drink water today. 🥛"
}
```
- **Response**:
```json
{
  "success": true,
  "recipient": "15551234567@c.us",
  "timestamp": "2026-08-06T04:00:00.000Z"
}
```

### 3. Send Structured Climate Alert
- **Endpoint**: `POST http://localhost:3000/send-alert`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "to": "15551234567",
  "city": "Chicago",
  "feelsLike": 34,
  "aqi": 105,
  "uvIndex": 8
}
```
- **Response**:
```json
{
  "success": true,
  "recipient": "15551234567@c.us",
  "alertType": "climate-warning",
  "timestamp": "2026-08-06T04:00:00.000Z"
}
```
- **Resulting WhatsApp Message Received**:
> 🚨 \*dayli Climate Warning Alert\* for \*Chicago\*
> 
> • Apparent Temp: \*34°C\* (Feels like)
> • Air Quality index: \*105\*
> • UV Sun index: \*8\*
> 
> ⚠️ \*Health Recommendation\*:
> Pregnant mothers should restrict outdoor travel, increase hydration (aim for 3L+), and keep infants inside air-conditioned rooms.
> 
> \*Reply "help" for specific clinical action checklists.\*

---

## 💻 Integrating into Your Existing Website

To connect your existing website's frontend to this WhatsApp bridge, you can use standard JavaScript `fetch()` requests when users submit their phone numbers.

### Example Code Snippet
Place this function in your website's script files to dispatch alerts dynamically:

```javascript
/**
 * Sends a real-time climate alert using the WhatsApp Bridge API
 * @param {string} phoneNumber - The user's WhatsApp phone number (e.g. "(555) 123-4567")
 * @param {string} city - The user's active location
 * @param {number} temp - Current feels-like temperature
 * @param {number} aqi - Current AQI value
 * @param {number} uv - Current UV Index
 */
async function triggerRealWhatsAppAlert(phoneNumber, city, temp, aqi, uv) {
    const bridgeUrl = 'http://localhost:3000/send-alert';
    
    try {
        const response = await fetch(bridgeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: phoneNumber,
                city: city,
                feelsLike: temp,
                aqi: aqi,
                uvIndex: uv
            })
        });

        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Real WhatsApp Alert dispatched successfully to', data.recipient);
            alert('WhatsApp notification sent!');
        } else {
            console.error('❌ Failed to send WhatsApp alert:', data.error);
        }
    } catch (error) {
        console.error('⚠️ Connection error reaching WhatsApp Bridge:', error);
    }
}
```
