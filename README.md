# dayli.ai — WhatsApp Chatflow & API Simulator Portal

A state-of-the-art developer reference and interactive simulation portal built to showcase the WhatsApp templates, clinical guidelines, and conversational decision trees for the **dayli.ai Climate Health Copilot**.

---

## 🌟 Features

### 1. Developer Reference Panel (Left Pane)
A tabbed documentation library allowing developers to quickly inspect each template in the onboarding and alert cycle:
- **Greet & Consent**: Accept/Decline message structures.
- **Profile Setup**: Interactive list selectors capturing trimesters or child age categories.
- **GPS Location**: Native coordinates request payload formats.
- **Climate Alert**: Critical morning bulletin warnings for high-heat/pollution days.
- **Symptom Check-in**: Active mid-day checks for health states.
- **Adherence Nudge**: Medication tracking nudges.

*Each template card renders:*
- **Vetted Health Targets**: The physiological reason for the template.
- **Static WhatsApp Bubble Mockup**: A visual rendering of how the message looks on WhatsApp Web.
- **Copy-to-Clipboard JSON Blocks**: The exact outbound Meta Business Cloud API JSON payload.

### 2. Live Chatflow Simulator (Right Pane)
A high-fidelity mobile device bezel running the active chatflow state machine:
- **Scenario Controllers**: Trigger flows instantly (`Onboarding`, `Morning Alert`, `Symptom Check`, `Adherence Nudge`) to test guided branches.
- **Interactive Button Replies**: Tap buttons within speech bubbles inside the phone to check chatbot routing.
- **Custom Text Queries**: Type inputs like *"heat"*, *"aqi"*, or *"symptoms"* inside the phone to query clinical guides with typing status delays.

---

## 🚀 How to Run Locally

Since the application uses standard fetch requests and clipboard hooks, run it via a local web server:

1. Open your terminal in this workspace folder.
2. Launch a Python HTTP server:
   ```bash
   python3 -m http.server 8000
   ```
3. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```
