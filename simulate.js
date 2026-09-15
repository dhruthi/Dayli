// dayli.ai - WhatsApp Chatflow Terminal Simulator
// This script simulates the WhatsApp Cloud API webhook interactions and chatbot flows.
// Run this file using: node simulate.js

const readline = require('readline');

// CLI Text formatting helpers
const colors = {
    green: '\x1b[32m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    magenta: '\x1b[35m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// App State
const state = {
    stage: 'welcome', // welcome, profile_select, location_select, language_select, home_ready
    profile: null,
    location: null,
    lang: null,
    weather: null
};

// Start Simulation
console.clear();
console.log(`${colors.green}${colors.bold}=================================================================`);
console.log(`🌸 dayli.ai - WhatsApp Chatflow CLI Simulator 👶`);
console.log(`Simulates official Meta WhatsApp Cloud API webhooks & webhook responses.`);
console.log(`=================================================================${colors.reset}\n`);

runFlowStep();

// Main Conversational State Machine
function runFlowStep() {
    switch (state.stage) {
        case 'welcome':
            printBotMessage(
                "interactive (button)",
                "Welcome to dayli.ai — your AI Climate Health Copilot. 🌸👶\n\nWe deliver localized climate-health alerts directly to your WhatsApp to keep you and your family safe from extreme heatwaves and air pollution.\n\nTo get started, please accept our privacy terms.",
                ["[1] Accept & Continue", "[2] Decline"]
            );
            
            // Print Mock Meta API JSON payload
            printMetaPayload({
                type: "interactive",
                interactive: {
                    type: "button",
                    body: { text: "Welcome to dayli.ai..." },
                    action: {
                        buttons: [
                            { type: "reply", reply: { id: "consent_accept", title: "Accept & Continue" } },
                            { type: "reply", reply: { id: "consent_decline", title: "Decline" } }
                        ]
                    }
                }
            });
            
            promptUser("Enter option number (1 or 2): ", (input) => {
                if (input === '1') {
                    state.stage = 'profile_select';
                    console.log(`\n${colors.cyan}[WEBHOOK TRIGGER] User clicked: "Accept & Continue" (ID: consent_accept)${colors.reset}\n`);
                    runFlowStep();
                } else {
                    console.log(`\n${colors.red}[SYSTEM] Declinining consent ends chat simulation.${colors.reset}`);
                    rl.close();
                }
            });
            break;

        case 'profile_select':
            printBotMessage(
                "interactive (list)",
                "To tailor your climate alerts, please select the category that best describes your profile:",
                [
                    "Maternal Stage:",
                    "  [1] Pregnant (Trimester 1 or 2)",
                    "  [2] Pregnant (Trimester 3)",
                    "Pediatric / Caregiver:",
                    "  [3] Parent of Infant (0-12 months)",
                    "  [4] Parent of Toddler (1-5 years)"
                ]
            );
            
            printMetaPayload({
                type: "interactive",
                interactive: {
                    type: "list",
                    body: { text: "To tailor your climate alerts..." },
                    action: {
                        button: "Select Category",
                        sections: [
                            { title: "Maternal", rows: [{ id: "stage_preg_early", title: "Pregnant (Trim 1-2)" }, { id: "stage_preg_late", title: "Pregnant (Trim 3)" }] }
                        ]
                    }
                }
            });

            promptUser("Enter choice (1, 2, 3, or 4): ", (input) => {
                const choices = {
                    '1': 'stage_preg_early',
                    '2': 'stage_preg_late',
                    '3': 'stage_infant',
                    '4': 'stage_toddler'
                };
                if (choices[input]) {
                    state.profile = choices[input];
                    state.stage = 'location_select';
                    console.log(`\n${colors.cyan}[WEBHOOK TRIGGER] User selected row: ${state.profile}${colors.reset}\n`);
                    runFlowStep();
                } else {
                    console.log(`${colors.red}Invalid option. Choose 1-4.${colors.reset}`);
                    runFlowStep();
                }
            });
            break;

        case 'location_select':
            printBotMessage(
                "location_request_message",
                "Profile updated! Now, let's bind your active location to track local heatwaves and air quality.\n\nPlease share your coordinates:",
                ["Type latitude & longitude coordinates (e.g. 28.61, 77.20 for Delhi, or 40.71, -74.00 for NY)"]
            );
            
            printMetaPayload({
                type: "interactive",
                interactive: {
                    type: "location_request_message",
                    body: { text: "Please tap the button below to share your location:" },
                    action: { name: "send_location" }
                }
            });

            promptUser("Enter coordinates (lat, lon): ", async (input) => {
                const coords = input.split(',').map(c => parseFloat(c.trim()));
                if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                    console.log(`\n${colors.cyan}[WEBHOOK RECEIVED] Coordinates: Lat ${coords[0]}, Lon ${coords[1]}${colors.reset}`);
                    console.log(`${colors.yellow}Fetching current climate data...${colors.reset}`);
                    
                    try {
                        const weather = await fetchClimateMetrics(coords[0], coords[1]);
                        state.location = weather.city;
                        state.weather = weather;
                        state.stage = 'home_ready';
                        
                        console.log(`\n${colors.green}✅ Coordinates geocoded to: ${weather.city}${colors.reset}\n`);
                        runFlowStep();
                    } catch (e) {
                        console.log(`${colors.red}Fetch failed. Retrying...${colors.reset}`);
                        runFlowStep();
                    }
                } else {
                    console.log(`${colors.red}Format must be 'lat, lon'. (e.g. 28.61, 77.20)${colors.reset}`);
                    runFlowStep();
                }
            });
            break;

        case 'home_ready':
            // Registration complete, show localized welcome alert
            const alertText = `✅ *Location mapped to ${state.location}!*

Today's Apparent Temp: *${state.weather.feelsLike}°C* (Feels like)
Air Quality Index (AQI): *${state.weather.aqi}*

${evaluateVulnerabilityGuide(state.weather.feelsLike, state.weather.aqi)}

*Your Copilot is active.* I will send daily forecasts here. Type keywords to query guides.`;

            printBotMessage("interactive (button)", alertText, [
                "[1] Sim Check-in flow",
                "[2] Sim Adherence nudge",
                "Or simply TYPE standard message query (e.g. 'heat', 'aqi', 'help')"
            ]);
            
            printMetaPayload({
                type: "interactive",
                interactive: {
                    type: "button",
                    body: { text: `Location mapped to ${state.location}...` },
                    action: {
                        buttons: [{ type: "reply", reply: { id: "query_current", title: "Show Active Guide" } }]
                    }
                }
            });

            promptUser("Enter command or choose (1 or 2): ", (input) => {
                const sanitized = input.trim().toLowerCase();
                if (sanitized === '1') {
                    triggerSymptomCheck();
                } else if (sanitized === '2') {
                    triggerAdherenceNudge();
                } else {
                    handleCustomText(sanitized);
                }
            });
            break;
    }
}

// Sub Flow: Mid-day Symptom Check-in
function triggerSymptomCheck() {
    console.log(`\n${colors.magenta}--- SIMULATING MID-DAY CHECK-IN FLOW (2:00 PM) ---${colors.reset}\n`);
    
    printBotMessage(
        "interactive (button)",
        `Hi! Apparent temperature is currently peaking at *${state.weather.feelsLike}°C* in *${state.location}*.\n\nHow are you and your children feeling?`,
        ["[1] We Feel Fine", "[2] Tired / Fatigued", "[3] Dizzy / Nauseous"]
    );
    
    printMetaPayload({
        type: "interactive",
        interactive: {
            type: "button",
            body: { text: "How are you and your children feeling?" },
            action: {
                buttons: [
                    { type: "reply", reply: { id: "symptom_fine", title: "We Feel Fine" } },
                    { type: "reply", reply: { id: "symptom_tired", title: "Tired / Fatigued" } },
                    { type: "reply", reply: { id: "symptom_dizzy", title: "Dizzy / Nauseous" } }
                ]
            }
        }
    });

    promptUser("Choose response (1, 2, or 3): ", (input) => {
        console.log(`\n${colors.cyan}[WEBHOOK TRIGGER] User clicked option ID: ${input === '1' ? 'symptom_fine' : input === '2' ? 'symptom_tired' : 'symptom_dizzy'}${colors.reset}\n`);
        
        console.log(`${colors.yellow}typing...${colors.reset}`);
        setTimeout(() => {
            if (input === '1') {
                printBotMessage(
                    "text",
                    "Glad to hear you are coping well! 😊\n\nEven when feeling fine under climate stress, hydration must remain high. Aim to finish another 1 Liter of water before evening."
                );
            } else if (input === '2') {
                printBotMessage(
                    "text",
                    "😴 Heat fatigue is a signal that your body is working double-time to thermoregulate.\n\n*Action Steps*:\n1. Stop physical exertion immediately.\n2. Rest in an air-conditioned room or in front of a fan.\n3. Drink cool water or an electrolyte solution."
                );
            } else {
                printBotMessage(
                    "interactive (button)",
                    "🚨 *CAUTION: Warning signs detected.*\n\nDizziness or nausea are signs of dehydration. This can lead to a drop in placental blood flow. Please lie down in a cool room, raise feet, and sip electrolyte ORS.",
                    ["[1] Find nearest Clinic"]
                );
            }
            
            promptUser("\nPress Enter to return to main menu...", () => {
                console.log("");
                state.stage = 'home_ready';
                runFlowStep();
            });
        }, 1000);
    });
}

// Sub Flow: Medication Adherence Nudge
function triggerAdherenceNudge() {
    console.log(`\n${colors.magenta}--- SIMULATING MEDICATION ADHERENCE NUDGE ---${colors.reset}\n`);
    
    printBotMessage(
        "interactive (button)",
        `⚠️ *Adherence Reminder*:\n\nExtreme heat waves can disrupt daily routines. Have you taken your prescribed vitamins/iron supplements today?`,
        ["[1] Yes, taken", "[2] Remind in 1 hour"]
    );

    promptUser("Choose response (1 or 2): ", (input) => {
        console.log(`\n${colors.cyan}[WEBHOOK TRIGGER] User clicked option ID: ${input === '1' ? 'nudge_yes' : 'nudge_no'}${colors.reset}\n`);
        console.log(`${colors.yellow}typing...${colors.reset}`);
        
        setTimeout(() => {
            if (input === '1') {
                printBotMessage("text", "Fantastic! Staying consistent protects your pregnancy and baby's growth. Drink a glass of water with it. 🥛");
            } else {
                printBotMessage("text", "Understood. I will send you a follow-up WhatsApp reminder in 1 hour. Keep cool and stay shaded in the meantime! 🍃");
            }
            
            promptUser("\nPress Enter to return to main menu...", () => {
                console.log("");
                state.stage = 'home_ready';
                runFlowStep();
            });
        }, 1000);
    });
}

// Handle keyword search
function handleCustomText(text) {
    console.log(`\n${colors.cyan}[WEBHOOK TRIGGER] User typed text message: "${text}"${colors.reset}\n`);
    console.log(`${colors.yellow}typing...${colors.reset}`);
    
    setTimeout(() => {
        if (text === 'help' || text === 'info') {
            printBotMessage(
                "text",
                `🌸 *dayli copilot commands*:\n\nReply with one of these keywords:\n👉 *heat* (temperature guides)\n👉 *aqi* (air pollution guides)\n👉 *uv* (sun exposure guides)\n👉 *hydration* (water guidelines)\n👉 *symptoms* (emergency warning signs)`
            );
        } else if (text.includes('heat') || text.includes('temperature') || text.includes('hot')) {
            printBotMessage(
                "text",
                `🥵 *Heat wave Protection Guide*:\n\n• Pregnant Women: drink 3L of water daily, restrict outdoors to early mornings.\n• Children: heat up 3x faster than adults. Offer fluids every 20 minutes, never leave kids in parked cars.`
            );
        } else if (text.includes('aqi') || text.includes('air') || text.includes('smoke') || text.includes('pollution')) {
            printBotMessage(
                "text",
                `💨 *Air Quality Guide*:\n\n• Mothers: PM2.5 crosses the placenta. Run HEPA air filters, close windows.\n• Kids: breathe faster, absorbing more toxins. Suspend outdoor play when AQI > 100. Do not mask babies under 2 years.`
            );
        } else if (text.includes('water') || text.includes('drink') || text.includes('hydrate') || text.includes('hydration')) {
            printBotMessage(
                "text",
                `💧 *dayli Hydration Nudges*:\n\n• Pregnancy: Aim for 2.7 to 3.0 Liters (12 cups) daily.\n• Infants: Under 6 months, only offer breastmilk/formula (no water).`
            );
        } else if (text.includes('symptom') || text.includes('signs') || text.includes('red flag') || text.includes('emergency')) {
            printBotMessage(
                "text",
                `🚨 *Emergency Red Flag Signs*:\n\nSeek immediate emergency medical care if you witness:\n• *Pregnant Mother*: Uterine contractions, severe headache/dizziness, chest pain, or sudden decrease in baby's movement.\n• *Infant/Child*: Extreme lethargy, grunting breaths, or dry mouth and crying without tears.`
            );
        } else {
            printBotMessage(
                "text",
                `Hello! I am dayli copilot. Type *'help'* to see clinical guidelines or *'1'* to simulate check-ins.`
            );
        }
        
        promptUser("\nPress Enter to return to main menu...", () => {
            console.log("");
            state.stage = 'home_ready';
            runFlowStep();
        });
    }, 1000);
}

// =================================================================
// SIMULATION HELPERS
// =================================================================

function promptUser(query, callback) {
    rl.question(`${colors.bold}${query}${colors.reset}`, callback);
}

function printBotMessage(type, bodyText, options = []) {
    console.log(`${colors.yellow}${colors.bold}-----------------------------------------------------------------`);
    console.log(`💬 RECEIVED WHATSAPP MESSAGE (Type: ${type.toUpperCase()})`);
    console.log(`-----------------------------------------------------------------${colors.reset}`);
    console.log(bodyText);
    
    if (options.length > 0) {
        console.log("");
        options.forEach(opt => console.log(`${colors.bold}${opt}${colors.reset}`));
    }
    console.log(`${colors.yellow}-----------------------------------------------------------------${colors.reset}\n`);
}

function printMetaPayload(payload) {
    console.log(`${colors.magenta}┌── [META CLOUD API MESSAGE PAYLOAD (OUTBOUND JSON)] ──┐`);
    console.log(JSON.stringify(payload, null, 2));
    console.log(`└──────────────────────────────────────────────────────┘${colors.reset}\n`);
}

// Evaluate Clinical Risks
function evaluateVulnerabilityGuide(feelsLike, aqi) {
    if (feelsLike >= 35) {
        return "⚠️ *WARNING*: Extreme heat triggers severe dehydration risks which can induce preterm contractions in pregnancy. Seek shaded rooms and cool water.";
    } else if (aqi >= 100) {
        return "⚠️ *WARNING*: Unhealthy air indices. Particulate matter PM2.5 crosses the placenta. Restrict kids' play outside and run HEPA purifiers.";
    } else {
        return "🌤️ Environment levels are safe today. Standard prenatal/pediatric guidelines apply.";
    }
}

// Fetch live metrics from open APIs (Weather + AQI + Nominatim)
async function fetchClimateMetrics(lat, lon) {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=apparent_temperature&daily=uv_index_max&timezone=auto`;
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5,us_aqi`;
    
    const weatherRes = await fetch(weatherUrl);
    const weatherData = await weatherRes.json();
    
    const aqiRes = await fetch(aqiUrl);
    const aqiData = await aqiRes.json();
    
    let city = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`, {
            headers: { 'User-Agent': 'dayli-ai-cli-simulator' }
        });
        const geoData = await geoRes.json();
        city = geoData.address.city || geoData.address.town || geoData.address.village || city;
    } catch (e) {
        // Fallback to coords
    }
    
    return {
        city,
        feelsLike: Math.round(weatherData.current.apparent_temperature),
        uvIndex: Math.round(weatherData.daily.uv_index_max[0]),
        aqi: Math.round(aqiData.current.us_aqi),
        pm25: Math.round(aqiData.current.pm2_5)
    };
}
