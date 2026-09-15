// dayli.ai - WhatsApp API Sandbox Portal Logic

// Application State
const state = {
    activeTemplate: 'climate_alert',
    lang: 'en',
    templateVars: {},
    chatHistory: [],
    botStatus: 'online'
};

// WhatsApp Message Template Configurations
const templatesDb = {
    consent_greet: {
        name: "consent_greet",
        type: "interactive (button)",
        variables: [],
        defaults: {},
        buildMessage: () => `
            <span class="bubble-header">dayli climate copilot</span>
            <p class="bubble-text">Hello! Welcome to dayli.ai. 🌸👶<br><br>We deliver localized climate-health alerts directly to your WhatsApp to keep you and your family safe from extreme heatwaves and air pollution.<br><br>To get started, please accept our privacy terms.</p>
            <span class="bubble-footer">Your data is kept private.</span>
            <div class="chat-options-container">
                <button class="chat-opt-btn" data-action="onboard_accept">Accept & Continue</button>
                <button class="chat-opt-btn" data-action="onboard_decline">Decline</button>
            </div>
        `,
        buildJson: () => {
            return {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: "{{USER_PHONE_NUMBER}}",
                type: "interactive",
                interactive: {
                    type: "button",
                    header: { type: "text", text: "dayli climate copilot" },
                    body: { text: "Hello! Welcome to dayli.ai. 🌸👶\n\nWe deliver localized climate-health alerts directly to your WhatsApp to keep you and your family safe from extreme heatwaves and air pollution.\n\nTo get started, please accept our privacy terms." },
                    footer: { text: "Your data is kept private." },
                    action: {
                        buttons: [
                            { type: "reply", reply: { id: "consent_accept", title: "Accept & Continue" } },
                            { type: "reply", reply: { id: "consent_decline", title: "Decline" } }
                        ]
                    }
                }
            };
        }
    },
    
    profile_setup: {
        name: "profile_setup",
        type: "interactive (list)",
        variables: [],
        defaults: {},
        buildMessage: () => `
            <span class="bubble-header">Profile Setup</span>
            <p class="bubble-text">To tailor your climate alerts, please select the option that best describes your profile:</p>
            <span class="bubble-footer">Choose one option</span>
            <div class="bubble-list-action">
                <i data-lucide="list"></i> Select Category
            </div>
            <div class="chat-options-container">
                <button class="chat-opt-btn" data-action="stage_preg">Pregnant (3rd Trim)</button>
                <button class="chat-opt-btn" data-action="stage_toddler">Parent of Toddler</button>
            </div>
        `,
        buildJson: () => {
            return {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: "{{USER_PHONE_NUMBER}}",
                type: "interactive",
                interactive: {
                    type: "list",
                    header: { type: "text", text: "Profile Setup" },
                    body: { text: "To tailor your climate alerts, please select the option that best describes your profile:" },
                    footer: { text: "Choose one option" },
                    action: {
                        button: "Select Category",
                        sections: [
                            {
                                title: "Maternal Stage",
                                rows: [
                                    { id: "stage_preg_early", title: "Pregnant (Trim 1 or 2)", description: "Months 1 through 6" },
                                    { id: "stage_preg_late", title: "Pregnant (Trim 3)", description: "Months 7 through 9" }
                                ]
                            },
                            {
                                title: "Caregiver",
                                rows: [
                                    { id: "stage_infant", title: "Parent of Infant", description: "Child aged 0 - 12 months" },
                                    { id: "stage_toddler", title: "Parent of Toddler", description: "Child aged 1 - 5 years" }
                                ]
                            }
                        ]
                    }
                }
            };
        }
    },
    
    gps_location: {
        name: "gps_location",
        type: "interactive (location_request_message)",
        variables: [],
        defaults: {},
        buildMessage: () => `
            <p class="bubble-text">Thank you. Now, let's bind your active location to track local heatwaves and air pollution.<br><br>Please tap the button below to share your location:</p>
            <div class="chat-options-container">
                <button class="chat-opt-btn text-emerald" data-action="share_gps"><i data-lucide="map-pin" class="icon-inline"></i> Send Location 📍</button>
            </div>
        `,
        buildJson: () => {
            return {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: "{{USER_PHONE_NUMBER}}",
                type: "interactive",
                interactive: {
                    type: "location_request_message",
                    body: { text: "Thank you. Now, let's bind your active location to track local heatwaves and air pollution.\n\nPlease tap the button below to share your location:" },
                    action: { name: "send_location" }
                }
            };
        }
    },
    
    climate_alert: {
        name: "climate_alert",
        type: "interactive (button)",
        variables: ["City", "FeelsLike", "AQI"],
        defaults: { City: "Dallas", FeelsLike: "43", AQI: "155" },
        buildMessage: (vars) => `
            <span class="bubble-header text-red">🚨 CLIMATE HEALTH ALERT</span>
            <p class="bubble-text">Today's forecast in *${vars.City}* indicates dangerous environmental levels:<br><br>• Apparent Temp: *${vars.FeelsLike}°C* (Dangerous Heat)<br>• Air Quality: *${vars.AQI}* (Unhealthy PM2.5)<br><br>⚠️ *Clinical Actions*:<br>- *Mothers*: High heat index levels trigger premature uterine contractions. Limit outdoor exposure and consume 3L+ water.<br>- *Children*: Suspend outdoor play. Keep windows closed to prevent lung exposure to PM2.5.</p>
            <div class="chat-options-container">
                <button class="chat-opt-btn" data-action="alert_cool">Stay Cool Tips</button>
                <button class="chat-opt-btn" data-action="alert_flags">Red Flag Symptoms</button>
            </div>
        `,
        buildJson: (vars) => {
            return {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: "{{USER_PHONE_NUMBER}}",
                type: "template",
                template: {
                    name: "climate_alert",
                    language: { code: state.lang },
                    components: [
                        {
                            type: "body",
                            parameters: [
                                { type: "text", text: vars.City },
                                { type: "text", text: vars.FeelsLike },
                                { type: "text", text: vars.AQI }
                            ]
                        }
                    ]
                }
            };
        }
    },
    
    clinic_referral: {
        name: "clinic_referral",
        type: "interactive (button)",
        variables: ["ClinicName", "ClinicPhone", "ClinicAddress"],
        defaults: { ClinicName: "Dallas Community Health Center", ClinicPhone: "(972) 888-7000", ClinicAddress: "101 Medical Plaza, Dallas" },
        buildMessage: (vars) => `
            <span class="bubble-header text-emerald">🏥 CLINICAL REFERRAL ACTIVE</span>
            <p class="bubble-text">Because you reported severe dizziness/contractions during today's heatwave, we have generated an emergency referral.<br><br>Would you like us to share your case summary with **${vars.ClinicName}** and book an urgent heat-health consult?</p>
            <div class="chat-options-container">
                <button class="chat-opt-btn" data-action="clinic_book_yes" data-clinic="${vars.ClinicName}" data-phone="${vars.ClinicPhone}" data-addr="${vars.ClinicAddress}">Book Consultation</button>
                <button class="chat-opt-btn" data-action="clinic_book_no">Decline Booking</button>
            </div>
        `,
        buildJson: (vars) => {
            return {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: "{{USER_PHONE_NUMBER}}",
                type: "template",
                template: {
                    name: "clinic_referral",
                    language: { code: state.lang },
                    components: [
                        {
                            type: "body",
                            parameters: [
                                { type: "text", text: vars.ClinicName },
                                { type: "text", text: vars.ClinicPhone },
                                { type: "text", text: vars.ClinicAddress }
                            ]
                        }
                    ]
                }
            };
        }
    },
    
    pharma_storage: {
        name: "pharma_storage",
        type: "interactive (button)",
        variables: ["SupplementName", "IndoorTemp"],
        defaults: { SupplementName: "Iron Folic Acid", IndoorTemp: "31" },
        buildMessage: (vars) => `
            <span class="bubble-header text-amber">💊 MEDICATION SAFETY NOTICE</span>
            <p class="bubble-text">Warning: Today's indoor temperatures may exceed ${vars.IndoorTemp}°C. Many supplements (such as *${vars.SupplementName}* and thyroid meds) degrade and lose efficacy if stored above 25°C.<br><br>⚠️ *Action*: Move your pills to the coolest room in the house, away from windows and direct sunlight.</p>
            <div class="chat-options-container">
                <button class="chat-opt-btn" data-action="pharma_storage_tips">View Storage Tips</button>
                <button class="chat-opt-btn" data-action="pharma_confirm_check">I Moved Them</button>
            </div>
        `,
        buildJson: (vars) => {
            return {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: "{{USER_PHONE_NUMBER}}",
                type: "template",
                template: {
                    name: "pharma_storage",
                    language: { code: state.lang },
                    components: [
                        {
                            type: "body",
                            parameters: [
                                { type: "text", text: vars.SupplementName },
                                { type: "text", text: vars.IndoorTemp }
                            ]
                        }
                    ]
                }
            };
        }
    },
    
    pilot_about: {
        name: "pilot_about",
        type: "interactive (list)",
        variables: ["MothersSupported", "ReferralsGenerated"],
        defaults: { MothersSupported: "1,800+", ReferralsGenerated: "312" },
        buildMessage: (vars) => `
            <span class="bubble-header">About dayli.ai</span>
            <p class="bubble-text">Select an option below to view our recent pilot analytics (supporting *${vars.MothersSupported}* mothers with *${vars.ReferralsGenerated}* referrals) and institutional information:</p>
            <span class="bubble-footer">Choose one option</span>
            <div class="bubble-list-action">
                <i data-lucide="list"></i> Select Topic
            </div>
            <div class="chat-options-container">
                <button class="chat-opt-btn" data-action="about_pilot_telangana_dynamic" data-mothers="${vars.MothersSupported}" data-referrals="${vars.ReferralsGenerated}">Telangana Pilot Stats</button>
                <button class="chat-opt-btn" data-action="about_founder">Founder & Team</button>
            </div>
        `,
        buildJson: (vars) => {
            return {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: "{{USER_PHONE_NUMBER}}",
                type: "template",
                template: {
                    name: "pilot_about",
                    language: { code: state.lang },
                    components: [
                        {
                            type: "body",
                            parameters: [
                                { type: "text", text: vars.MothersSupported },
                                { type: "text", text: vars.ReferralsGenerated }
                            ]
                        }
                    ]
                }
            };
        }
    }
};

// Vetted Clinical Guides for Chatbot Simulation
const clinicalGuides = {
    heat: `🥵 <strong>Heat wave Protection Guide</strong>:<br><br>• <strong>Pregnant Women:</strong> High heat index levels trigger premature uterine contractions. Limit outdoor exposure, stay in cool spaces, and drink 3.5L of water today.<br>• <strong>Children:</strong> Kids sweat less and heat up 3x faster than adults. Never leave them in parked cars, dress in lightweight cotton, and offer fluids every 20 minutes.`,
    aqi: `💨 <strong>Air Quality Safety Guide</strong>:<br><br>• <strong>Mothers:</strong> Fine particulates (PM2.5) can cross the placenta barrier, raising fetal development risks. Keep windows closed and run HEPA air purifiers inside.<br>• <strong>Children:</strong> Child lungs are still developing. Suspend outdoor play on highly polluted days. Do NOT mask infants under 2 years.`,
    uv: `☀️ <strong>UV Sun Exposure Guide</strong>:<br><br>• <strong>Pregnancy:</strong> Hormones sensitize skin to UV, causing melasma (dark facial patches). Use SPF 30+ physical block.<br>• <strong>Infants:</strong> Keep babies under 6 months completely in shade. For toddlers, apply broad-spectrum sunscreen every 2 hours.`,
    hydration: `💧 <strong>Maternal Hydration Guidelines</strong>:<br><br>• <strong>Pregnancy:</strong> Dehydration triggers the release of oxytocin, which can cause premature contractions. Aim for 2.7 to 3.0 Liters (12 cups) of water daily.`,
    symptoms: `🚨 <strong>Emergency Red Flag Signs</strong>:<br><br>Seek immediate emergency medical care if you witness:<br>• <strong>Pregnant Mother:</strong> Uterine contractions, severe headache/dizziness, chest pain, or sudden decrease in baby's movement.<br>• <strong>Infant/Child:</strong> Extreme lethargy, grunting breaths, or dry mouth and crying without tears.`
};

// =================================================================
// INITIALIZATION
// =================================================================
document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
    initSandboxController();
    initiPhoneSimulator();
    
    // Set initial variables inputs for selected template
    loadTemplateConfig(state.activeTemplate);
    
    // Clear chat simulation log initially
    const container = document.getElementById("demo-messages-container");
    container.innerHTML = `<div class="chat-system-date">TODAY</div>`;
    
    // Trigger initial onboarding greeting so simulator doesn't load empty
    triggerSimulatedBotPayload(templatesDb.consent_greet.buildMessage());
});

// =================================================================
// SANDBOX CONTROLLER PANEL (Step Form & Live JSON Compiler)
// =================================================================
function initSandboxController() {
    const templateSelect = document.getElementById("template-select");
    const langSelect = document.getElementById("language-select");
    const btnSendApi = document.getElementById("btn-trigger-api");
    const toggleModeBtn = document.getElementById("btn-view-mode");

    // 1. Template dropdown change
    templateSelect.addEventListener("change", (e) => {
        state.activeTemplate = e.target.value;
        loadTemplateConfig(state.activeTemplate);
    });

    // 2. Language dropdown change
    langSelect.addEventListener("change", (e) => {
        state.lang = e.target.value;
        recompileApiOutputs();
    });

    // 3. Send API Message trigger
    btnSendApi.addEventListener("click", () => {
        const config = templatesDb[state.activeTemplate];
        const msgHtml = config.buildMessage(state.templateVars);
        
        // Push message to iPhone Simulator chat screen
        triggerSimulatedBotPayload(msgHtml);
        
        // Log Webhook API Delivery success to console
        logWebhookSandboxEvent("API_OUTBOUND_DISPATCHED", {
            event: "messages_sent",
            timestamp: Math.round(new Date().getTime() / 1000),
            recipient: "15550100@c.us",
            payload: config.buildJson(state.templateVars)
        });
    });

    // 4. View Mode Toggle
    if (toggleModeBtn) {
        toggleModeBtn.addEventListener("click", () => {
            const body = document.body;
            body.classList.toggle("app-mode");
            
            const isAppMode = body.classList.contains("app-mode");
            if (isAppMode) {
                toggleModeBtn.innerHTML = `<i data-lucide="layout"></i> Dev Mode`;
            } else {
                toggleModeBtn.innerHTML = `<i data-lucide="smartphone"></i> Standalone App`;
            }
            lucide.createIcons();
        });
    }
}

// Generate parameter inputs dynamically based on selected template metadata
function loadTemplateConfig(templateName) {
    const config = templatesDb[templateName];
    const container = document.getElementById("variables-inputs-container");
    container.innerHTML = ""; // reset inputs

    state.templateVars = { ...config.defaults };

    if (config.variables.length === 0) {
        container.innerHTML = `<span class="terminal-placeholder">// This template contains no variable parameters. Ready to send.</span>`;
    } else {
        config.variables.forEach(varKey => {
            const row = document.createElement("div");
            row.className = "variable-row";
            row.innerHTML = `
                <span class="variable-tag">${varKey}</span>
                <input type="text" class="form-control-input var-input" data-var="${varKey}" value="${state.templateVars[varKey]}">
            `;
            container.appendChild(row);
        });

        // Add live listeners to inputs
        container.querySelectorAll(".var-input").forEach(input => {
            input.addEventListener("input", (e) => {
                const varKey = e.target.getAttribute("data-var");
                state.templateVars[varKey] = e.target.value;
                recompileApiOutputs();
            });
        });
    }

    recompileApiOutputs();
}

// Recompile live JSON and cURL outputs
function recompileApiOutputs() {
    const config = templatesDb[state.activeTemplate];
    const jsonPayload = config.buildJson(state.templateVars);
    
    // Compile cURL code block
    const curlCode = document.getElementById("code-curl");
    curlCode.textContent = `curl -X POST \\
  https://graph.facebook.com/v18.0/1029384756/messages \\
  -H 'Authorization: Bearer EAAy...' \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify(jsonPayload, null, 2)}'`;
}

// =================================================================
// RIGHT PANEL: IPHONE SIMULATOR INTERACTIVE APP
// =================================================================
function initiPhoneSimulator() {
    const chatContainer = document.getElementById("demo-messages-container");
    const sendBtn = document.getElementById("btn-demo-send");
    const chatInput = document.getElementById("demo-chat-input");
    const clearTerminalBtn = document.getElementById("btn-clear-terminal");

    // 1. Interactive Button Reply options (Delegated)
    chatContainer.addEventListener("click", (e) => {
        if (e.target.classList.contains("chat-opt-btn")) {
            const action = e.target.getAttribute("data-action");
            const label = e.target.textContent;
            
            // Disable other sibling buttons
            const parent = e.target.parentElement;
            parent.querySelectorAll(".chat-opt-btn").forEach(b => {
                b.classList.add("disabled");
                b.disabled = true;
            });
            e.target.classList.remove("disabled");

            // Post User Message bubble
            appendUserMessage(label);

            // Dispatch Meta Cloud Webhook payload
            logWebhookSandboxEvent("WEBHOOK_INBOUND_RECEIVED", {
                object: "whatsapp_business_account",
                entry: [{
                    id: "WHATSAPP_BUSINESS_ACCOUNT_ID",
                    changes: [{
                        value: {
                            messaging_product: "whatsapp",
                            metadata: { display_phone_number: "15550100", phone_number_id: "1029384756" },
                            contacts: [{ profile: { name: "Test User" }, wa_id: "15550100" }],
                            messages: [{
                                from: "15550100",
                                id: "wamid.HBgLMTU1NTAxMDAzMTUVAgARGBIwRDdBQ0Y2QzND...",
                                timestamp: Math.round(new Date().getTime() / 1000),
                                type: "interactive",
                                interactive: {
                                    type: "button_reply",
                                    button_reply: { id: action, title: label }
                                }
                            }]
                        },
                        field: "messages"
                    }]
                }]
            });

            // Trigger simulator response
            handleSimulatedChatbotResponse(action, e.target);
        }
    });

    // 2. Chat input submission
    sendBtn.addEventListener("click", () => {
        handleChatInputText(chatInput.value);
    });
    chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            handleChatInputText(chatInput.value);
        }
    });

    // 3. Clear logs console
    clearTerminalBtn.addEventListener("click", () => {
        const logsBody = document.getElementById("webhook-logs-body");
        logsBody.innerHTML = `<span class="terminal-placeholder">// Terminal cleared. Trigger chat flow buttons to write new logs...</span>`;
    });
}

// Push Bot Message directly
function triggerSimulatedBotPayload(msgHtml) {
    showTyping();
    setTimeout(() => {
        removeTyping();
        pushBotMessage(msgHtml);
    }, 400);
}

function appendUserMessage(text) {
    const container = document.getElementById("demo-messages-container");
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const msg = document.createElement("div");
    msg.className = "chat-msg chat-msg-sent";
    msg.innerHTML = `
        <div class="msg-bubble">
            ${text}
            <span class="msg-time">${time}</span>
        </div>
    `;
    container.appendChild(msg);
    scrollChat();
}

function pushBotMessage(htmlContent) {
    const container = document.getElementById("demo-messages-container");
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const msg = document.createElement("div");
    msg.className = "chat-msg chat-msg-received";
    msg.innerHTML = `
        <div class="msg-bubble">
            ${htmlContent}
            <span class="msg-time">${time}</span>
        </div>
    `;
    container.appendChild(msg);
    scrollChat();
}

function showTyping() {
    const container = document.getElementById("demo-messages-container");
    const typing = document.createElement("div");
    typing.className = "chat-msg chat-msg-received sim-typing-bubble";
    typing.innerHTML = `
        <div class="msg-bubble">
            <span class="typing-indicator">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </span>
        </div>
    `;
    container.appendChild(typing);
    scrollChat();
    document.getElementById("copilot-status").textContent = "typing...";
}

function removeTyping() {
    const bubble = document.querySelector(".sim-typing-bubble");
    if (bubble) bubble.remove();
    document.getElementById("copilot-status").textContent = "online";
}

function scrollChat() {
    const container = document.getElementById("demo-messages-container");
    if (container) {
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 80);
    }
}

// =================================================================
// SIMULATION CHATFLOW STATE ROUTING
// =================================================================
function handleSimulatedChatbotResponse(action, targetBtnEl) {
    showTyping();
    
    setTimeout(() => {
        removeTyping();

        // Onboarding consent responses
        if (action === "onboard_accept") {
            pushBotMessage(templatesDb.profile_setup.buildMessage());
        } else if (action === "onboard_decline") {
            pushBotMessage("Understood. If you change your mind and want to set up climate alerts, simply type *'hello'* to start again.");
        } 
        
        // Profile setup stage choices
        else if (action === "stage_preg" || action === "stage_toddler") {
            pushBotMessage(templatesDb.gps_location.buildMessage());
        } 
        
        // GPS location coordinates request
        else if (action === "share_gps") {
            if (navigator.geolocation) {
                pushBotMessage("📡 <em>Requesting browser GPS credentials... Please allow location access.</em>");
                showTyping();
                navigator.geolocation.getCurrentPosition(async (position) => {
                    removeTyping();
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    
                    showTyping();
                    const metrics = await fetchClimateMetrics(lat, lon);
                    removeTyping();
                    
                    // Update state variables dynamically
                    state.userLocation = metrics.city;
                    state.userFeelsLike = metrics.feelsLike;
                    state.userAqi = metrics.aqi;
                    state.userUv = metrics.uvIndex;
                    
                    showTyping();
                    setTimeout(() => {
                        removeTyping();
                        pushBotMessage(
                            `🎉 <strong>Onboarding Completed!</strong><br><br>Mapped location: <strong>${metrics.city}</strong><br>• Apparent Temp: <strong>${metrics.feelsLike}°C</strong><br>• Air Quality: <strong>${metrics.aqi}</strong> (AQI)<br>• UV Index: <strong>${metrics.uvIndex}</strong><br><br>Climate alerts are active. Type *'help'* to verify commands.`
                        );
                    }, 500);
                }, (error) => {
                    removeTyping();
                    pushBotMessage(
                        `⚠️ <strong>GPS Access Denied/Failed</strong>.<br><br>Using default location: <strong>Dallas, US</strong><br>• Apparent Temp: <strong>43°C</strong><br>• Air Quality: <strong>155</strong><br><br>Registration complete! Type *'help'* to query guidelines.`
                    );
                });
            } else {
                pushBotMessage(`🎉 <strong>Onboarding Completed!</strong> (GPS not supported). Type *'help'* to query guidelines.`);
            }
        } 
        
        // Climate alert details
        else if (action === "alert_cool") {
            pushBotMessage(`🌞 <strong>Stay Cool Guide</strong>:<br><br>• Rest in air-conditioned or shaded rooms.<br>• Place cooling wet towels on neck or forehead.<br>• Drink water consistently. Aim for 3.5L today.`);
        } else if (action === "alert_flags") {
            pushBotMessage(`🚨 <strong>Emergency Warning Signs</strong>:<br><br>Seek immediate medical care if you witness:<br>• <strong>Pregnant Mother</strong>: Contractions, chest pressure, dizziness, or decrease in baby's movement.<br>• <strong>Infant/Child</strong>: High fever, grunting breathing, extreme drowsiness, or dry mouth.`);
        } 
        
        // Clinic referrals bookings
        else if (action === "clinic_book_yes") {
            const clinicName = targetBtnEl.getAttribute("data-clinic") || "Dallas Community Health Center";
            const clinicPhone = targetBtnEl.getAttribute("data-phone") || "(972) 888-7000";
            const clinicAddress = targetBtnEl.getAttribute("data-addr") || "101 Medical Plaza, Dallas";
            
            pushBotMessage(
                `✅ <strong>Case Details Dispatched!</strong><br><br>Your clinical referral card has been securely sent to <strong>${clinicName}</strong>.<br><br>🏥 <strong>Location</strong>: ${clinicAddress}<br>📞 <strong>Direct Doctor Call</strong>: ${clinicPhone}<br><br>Please proceed there immediately or call. Show them this chat screen upon arrival.`
            );
        } else if (action === "clinic_book_no") {
            pushBotMessage("Understood. Emergency booking declined. Please rest in a cool space, elevate your legs, and sip ORS. If dizziness worsens, dial emergency services immediately.");
        } 
        
        // Pharma safety guidelines
        else if (action === "pharma_storage_tips") {
            pushBotMessage(`🌡️ <strong>Medication Storage Guidelines</strong>:<br><br>• Store medications in a dry drawer or closet floor (closet floors are usually the coolest spot!).<br>• Avoid bathrooms and kitchens where humidity and steam degrade molecular stability.<br>• Keep out of direct sunlight.`);
        } else if (action === "pharma_confirm_check") {
            pushBotMessageWithButtons(
                `Excellent! Storing medication properly maintains its active chemical efficacy.<br><br>Have you taken your supplements today?`,
                [
                    { label: "Yes, taken", action: "nudge_yes" },
                    { label: "Remind in 1 hour", action: "nudge_no" }
                ]
            );
        } else if (action === "nudge_yes") {
            pushBotMessage(`Fantastic! Staying consistent protects your pregnancy and baby's growth. Drink a glass of water with it. 🥛`);
        } else if (action === "nudge_no") {
            pushBotMessage(`Understood. I will send you a follow-up WhatsApp reminder in 1 hour. Keep cool and stay shaded in the meantime! 🍃`);
        }
        
        // Telangana pilot metrics query response
        else if (action === "about_pilot_telangana_dynamic") {
            const mothers = targetBtnEl.getAttribute("data-mothers") || "1,800+";
            const referrals = targetBtnEl.getAttribute("data-referrals") || "312";
            pushBotMessage(
                `📈 <strong>dayli.ai Telangana Pilot Results (Apr–Sep 2025)</strong>:<br><br>• <strong>Partners</strong>: Women Development & Child Welfare Department, Telangana.<br>• <strong>Mothers Supported</strong>: ${mothers} pregnant/lactating women.<br>• <strong>Conversations Handled</strong>: 24,000+ chats.<br>• <strong>Warning Alerts Sent</strong>: 4,200+ warnings.<br>• <strong>High-Risk Referrals Generated</strong>: ${referrals} successful transfers to clinical health centers.`
            );
        } else if (action === "about_founder") {
            pushBotMessage(`👩 <strong>Founder & Team Details</strong>:<br><br>• <strong>Founder</strong>: Dhruthi Kuram (CEO, MS in Computer Science from San José State University, creator of BabyBoo tracking app).<br>• <strong>Mission</strong>: Translating advanced meteorological datasets into practical, plain-language clinical guidelines delivered over WhatsApp to support mothers and child caregivers.`);
        }
    }, 1000);
}

// User types a text query in phone input
function handleChatInputText(query) {
    if (!query || query.trim() === "") return;
    
    appendUserMessage(query);
    document.getElementById("demo-chat-input").value = "";
    
    // Log Webhook Inbound Message text JSON
    logWebhookSandboxEvent("WEBHOOK_INBOUND_RECEIVED", {
        object: "whatsapp_business_account",
        entry: [{
            id: "WHATSAPP_BUSINESS_ACCOUNT_ID",
            changes: [{
                value: {
                    messaging_product: "whatsapp",
                    metadata: { display_phone_number: "15550100", phone_number_id: "1029384756" },
                    contacts: [{ profile: { name: "Test User" }, wa_id: "15550100" }],
                    messages: [{
                        from: "15550100",
                        id: "wamid.HBgLMTU1NTAxMDAzMTUVAgARGBIwRDdBQ...",
                        timestamp: Math.round(new Date().getTime() / 1000),
                        type: "text",
                        text: { body: query }
                    }]
                },
                field: "messages"
            }]
        }]
    });

    showTyping();
    
    let resolvedText = `🤖 <strong>dayli Help Center</strong>:<br><br>I heard you say: "${escapeHTML(query)}".<br><br>I can provide guidelines on:<br>👉 <strong>heat</strong> (temperature checks)<br>👉 <strong>aqi</strong> (air quality guides)<br>👉 <strong>uv</strong> (sun exposure advice)<br>👉 <strong>hydration</strong> (water reminders)<br>👉 <strong>symptoms</strong> (clinical red flags)<br><br>Type one of these words to get started!`;
    
    const normalized = query.toLowerCase();
    
    if (normalized === 'help' || normalized === 'info') {
        resolvedText = `🌸 *dayli copilot commands*:<br><br>Reply with one of these keywords:<br>👉 *heat* (temperature guides)<br>👉 *aqi* (air pollution guides)<br>👉 *uv* (sun exposure guides)<br>👉 *hydration* (water guidelines)<br>👉 *symptoms* (emergency warning signs)`;
    } else if (normalized.includes('heat') || normalized.includes('hot') || normalized.includes('temperature')) {
        resolvedText = clinicalGuides.heat;
    } else if (normalized.includes('aqi') || normalized.includes('air') || normalized.includes('smoke') || normalized.includes('pollution')) {
        resolvedText = clinicalGuides.aqi;
    } else if (normalized.includes('uv') || normalized.includes('sun') || normalized.includes('skin') || normalized.includes('sunscreen')) {
        resolvedText = clinicalGuides.uv;
    } else if (normalized.includes('water') || normalized.includes('drink') || normalized.includes('hydrate') || normalized.includes('hydration') || normalized.includes('dehydration')) {
        resolvedText = clinicalGuides.hydration;
    } else if (normalized.includes('symptom') || normalized.includes('signs') || normalized.includes('red flag') || normalized.includes('emergency')) {
        resolvedText = clinicalGuides.symptoms;
    }
    
    setTimeout(() => {
        removeTyping();
        pushBotMessage(resolvedText);
    }, 1000);
}

// Push Bot Message with custom Action Buttons
function pushBotMessageWithButtons(htmlContent, buttons) {
    const container = document.getElementById("demo-messages-container");
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let buttonsHtml = '<div class="chat-options-container">';
    buttons.forEach(btn => {
        buttonsHtml += `<button class="chat-opt-btn" data-action="${btn.action}">${btn.label}</button>`;
    });
    buttonsHtml += '</div>';
    
    const msg = document.createElement("div");
    msg.className = "chat-msg chat-msg-received";
    msg.innerHTML = `
        <div class="msg-bubble">
            ${htmlContent}
            ${buttonsHtml}
            <span class="msg-time">${time}</span>
        </div>
    `;
    container.appendChild(msg);
    scrollChat();
}

// =================================================================
// WEBHOOK LOGS TERMINAL PRINT METHODS
// =================================================================
function logWebhookSandboxEvent(eventType, jsonData) {
    const logsBody = document.getElementById("webhook-logs-body");
    const placeholder = logsBody.querySelector(".terminal-placeholder");
    if (placeholder) placeholder.remove();
    
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement("div");
    entry.className = "terminal-log-entry";
    
    const titleText = eventType === "API_OUTBOUND_DISPATCHED" 
        ? `⚡ OUTBOUND SEND MESSAGE PAYLOAD (HTTP POST)`
        : `📥 INCOMING WEBHOOK CALLBACK EVENT`;
        
    entry.innerHTML = `
        <span class="terminal-log-time">[${time}] ${titleText}</span>
        <pre>${syntaxHighlightJson(jsonData)}</pre>
    `;
    
    logsBody.appendChild(entry);
    logsBody.scrollTop = logsBody.scrollHeight;
}

// Pretty prints JSON with spans to allow CSS highlights
function syntaxHighlightJson(jsonObj) {
    let jsonStr = JSON.stringify(jsonObj, null, 2);
    jsonStr = jsonStr.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    return jsonStr.replace(/("(\\u[a-zA-family0-9]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, function (match) {
        let cls = 'term-num';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'term-key';
            } else {
                cls = 'term-str';
            }
        } else if (/true|false/.test(match)) {
            cls = 'term-bool';
        }
        return `<span class="${cls}">${match}</span>`;
    });
}

// Helper: Escape user input to prevent XSS
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// Fetch live metrics from open APIs (Weather + AQI + Nominatim)
async function fetchClimateMetrics(lat, lon) {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=apparent_temperature&daily=uv_index_max&timezone=auto`;
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5,us_aqi`;
    
    try {
        const [weatherRes, aqiRes] = await Promise.all([
            fetch(weatherUrl).then(r => r.json()),
            fetch(aqiUrl).then(r => r.json())
        ]);
        
        const feelsLike = Math.round(weatherRes.current.apparent_temperature);
        const uvIndex = Math.round(weatherRes.daily.uv_index_max[0]);
        const aqi = Math.round(aqiRes.current.us_aqi);
        
        let city = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
        try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`, {
                headers: { 'User-Agent': 'dayli-ai-application' }
            });
            const geoData = await geoRes.json();
            city = geoData.address.city || geoData.address.town || geoData.address.village || city;
        } catch (e) {
            console.warn("Reverse geocode failed", e);
        }
        
        return { city, feelsLike, aqi, uvIndex };
    } catch (err) {
        console.error("Climate fetch failed", err);
        return { city: "Dallas, US", feelsLike: 43, aqi: 155, uvIndex: 8 }; // fallback
    }
}
