# Dayli AI Video Production Screenplay & Master Shot List

**Target Length:** ~4 minutes 30 seconds  
**Resolution:** 1080p (1920x1080) or 4K, 30fps / 60fps  
**Audio Voiceover Engine:** ElevenLabs (`eleven_multilingual_v2`, Voice: Rachel or Bella)  
**Aspect Ratio:** 16:9 for YouTube/Web documentation (with 9:16 mobile mockup cuts for WhatsApp)

---

## Pre-Recording Checklist

- [ ] **Clean Browser Environment:** Use a dedicated Chrome/Brave profile without bookmarks bar or extensions.
- [ ] **Display Setup:** Set resolution to standard 1080p (1920x1080) or clean scaled retina mode.
- [ ] **Do Not Disturb:** Enable OS Focus/Do Not Disturb mode to silence system notifications.
- [ ] **WhatsApp Test Device:**
  - Option A: WhatsApp Web in browser window (zoomed to 110% for mobile-like legibility).
  - Option B: iPhone Mirroring / scrcpy / QuickTime phone recording.
  - Option C: Use the Dayli AI Dashboard **Observatory Sandbox** (`/dashboard` -> Observatory tab) to simulate full conversations without needing live Meta API credits.
- [ ] **Local Server:** Run `npm run dev` in `whatsapp-bridge` so the dashboard and webhook services are online.
- [ ] **Privacy Check:** Ensure no real user phone numbers, tokens, or PII are visible.

---

## Scene-by-Scene Screenplay & Shot List

```
+---------------------------------------------------------------------------------------+
| SCENE 1: Hook & Website Overview (0:00 - 0:40)                                        |
+---------------------------------------------------------------------------------------+
| Visual:                                                                               |
|  - Open browser to https://dayli.ai.                                                  |
|  - Smooth slow scroll down through hero section and climate vulnerability stats.      |
|  - Pause at the interactive feature highlights (heat warnings, air quality alerts).  |
|  - Zoom in slightly on the primary CTA: "Chat on WhatsApp".                          |
|                                                                                       |
| Audio Voiceover (Scene 1):                                                            |
|  "Heat waves, poor air quality, and sudden weather shifts hit mothers and children    |
|   first, yet guidance rarely reaches them where they are. Dayli AI is a climate       |
|   health copilot that lives directly inside WhatsApp, so there is nothing new to      |
|   download. Here is the website. It explains how Dayli AI works, how your data is     |
|   protected with explicit consent, and gives you a single tap to connect right from   |
|   your phone."                                                                        |
+---------------------------------------------------------------------------------------+
```

```
+---------------------------------------------------------------------------------------+
| SCENE 2: WhatsApp Consent & Onboarding (0:40 - 1:25)                                  |
+---------------------------------------------------------------------------------------+
| Visual:                                                                               |
|  - WhatsApp chat window opens with Dayli AI verified / test profile.                  |
|  - User sends initial trigger message: "Hi".                                          |
|  - Immediate inbound reply from Dayli AI with Consent Card:                          |
|    - Privacy terms and transparent notice.                                            |
|    - Interactive quick-reply buttons: [Yes, I agree] [Read Terms] [No].               |
|  - Click "Yes, I agree".                                                              |
|  - Next prompt appears: "Who is this guidance for?"                                   |
|  - Select button: [My child].                                                         |
|  - Choose age category: [Infant: 0-12 months].                                        |
|  - On-screen callout / graphic highlight: "Explicit & Revocable Consent".             |
|                                                                                       |
| Audio Voiceover (Scene 2):                                                            |
|  "Everything starts with consent. When a user says hi, Dayli AI explains what         |
|   information is stored and asks for an explicit yes. You can opt out at any time     |
|   just by typing 'stop'. It then asks only two simple questions: who the guidance is  |
|   for, and where you are located. Every step is skippable, ensuring no one is ever   |
|   locked out of asking an urgent health question."                                    |
+---------------------------------------------------------------------------------------+
```

```
+---------------------------------------------------------------------------------------+
| SCENE 3: Live Climate Enrichment & Context (1:25 - 2:20)                               |
+---------------------------------------------------------------------------------------+
| Visual:                                                                               |
|  - User shares location (or types: "Hyderabad").                                      |
|  - User asks: "Is it safe to take my 6-month-old baby out for a walk this afternoon?"  |
|  - Brief typing indicator.                                                            |
|  - Dayli AI replies with rich formatted message:                                      |
|    - Current temperature (e.g., 38°C / Feels like 41°C).                              |
|    - AQI rating (e.g., AQI 162 - Unhealthy for sensitive groups).                     |
|    - Actionable clinical recommendation: "Avoid direct outdoor exposure between       |
|      11 AM and 4 PM. Keep baby hydrated with frequent feeds."                         |
|  - Overlay graphic: diagram showing Open-Meteo weather + AQI API feeding into LLM.    |
|                                                                                       |
| Audio Voiceover (Scene 3):                                                            |
|  "Once Dayli AI knows your general location, it automatically checks real-time        |
|   weather and air quality from Open-Meteo. When a mother asks if it is safe to take   |
|   her newborn outside, Dayli AI does not give generic advice. It evaluates today's    |
|   heat index and PM 2.5 levels, translating complex environmental data into clear,    |
|   protective actions tailored to her baby."                                           |
+---------------------------------------------------------------------------------------+
```

```
+---------------------------------------------------------------------------------------+
| SCENE 4: Multilingual, Voice Notes & Clinic Finder (2:20 - 3:05)                      |
+---------------------------------------------------------------------------------------+
| Visual:                                                                               |
|  - Fast montage of accessibility features:                                            |
|    1. User asks in Telugu: "నా బిడ్డకు ఎండ తగలకుండా ఏం జాగ్రత్తలు తీసుకోవాలి?"        |
|       Dayli AI answers fluently in Telugu with identical clinical precision.          |
|    2. User sends an audio voice note. Dayli AI's ASR processes it and replies.        |
|    3. User asks: "Where is the nearest primary health center or clinic?"             |
|       Dayli AI returns a formatted list of open health facilities with OSM distances. |
|                                                                                       |
| Audio Voiceover (Scene 4):                                                            |
|  "Care is most effective in your mother tongue. Dayli AI supports Hindi, Telugu,      |
|   and Arabic seamlessly. Users can send voice notes when typing is difficult, and     |
|   Dayli AI transcribes and responds back. And whenever physical examination is        |
|   needed, the built-in clinic locator surfaces nearby healthcare centers in seconds."  |
+---------------------------------------------------------------------------------------+
```

```
+---------------------------------------------------------------------------------------+
| SCENE 5: Deterministic Clinical Safety Engine (3:05 - 3:45)                           |
+---------------------------------------------------------------------------------------+
| Visual:                                                                               |
|  - User types an acute emergency message:                                             |
|    "My baby has a high fever, is breathing very fast and chest is sinking in."       |
|  - Instantaneous escalation response from Dayli AI (bypassing normal LLM tone):       |
|    - RED ALERT banner format.                                                         |
|    - "EMERGENCY: Please seek immediate medical attention at the nearest emergency     |
|      department or call 108 / 102."                                                   |
|    - Red-flag checklist items.                                                        |
|  - Split-screen / overlay callout: Diagram of `shared/safetyCore.js` deterministic     |
|    rule evaluation overriding probabilistic LLM outputs.                              |
|                                                                                       |
| Audio Voiceover (Scene 5):                                                            |
|  "Safety is never left to chance. Every single response passes through a deterministic|
|   clinical safety core before being dispatched. If a message contains red flags like  |
|   infant respiratory distress or severe dehydration, Dayli AI immediately issues      |
|   urgent escalation guidance. The underlying AI model cannot override these clinical  |
|   guardrails."                                                                        |
+---------------------------------------------------------------------------------------+
```

```
+---------------------------------------------------------------------------------------+
| SCENE 6: Intelligence & Surveillance Dashboard (3:45 - 4:25)                          |
+---------------------------------------------------------------------------------------+
| Visual:                                                                               |
|  - Browser navigates to `http://localhost:3000/dashboard` (or deployed dashboard).    |
|  - Show overview tab: Total active sessions, maternal cohorts, climate risk index.   |
|  - Click to "Surveillance" tab: Leaflet heat and AQI geospatial heat map across       |
|    districts/regions.                                                                 |
|  - Click to "Compliance" tab: Demonstrating anonymized consent verification ledger.   |
|  - Click to "Observatory" tab: Demonstrate the live conversation simulation panel.    |
|                                                                                       |
| Audio Voiceover (Scene 6):                                                            |
|  "Behind the scenes, the Dayli AI dashboard provides public health teams with live    |
|   population-level intelligence. Operators can monitor heat and air quality           |
|   surveillance maps, track consent audit compliance, analyze symptom trends, and test  |
|   conversational flows live in the observatory sandbox."                              |
+---------------------------------------------------------------------------------------+
```

```
+---------------------------------------------------------------------------------------+
| SCENE 7: Outro & Call to Action (4:25 - 4:45)                                         |
+---------------------------------------------------------------------------------------+
| Visual:                                                                               |
|  - Clean transition back to Dayli AI brand card with logo and typography.             |
|  - On-screen URL: dayli.ai                                                            |
|  - Fade out.                                                                          |
|                                                                                       |
| Audio Voiceover (Scene 7):                                                            |
|  "Dayli AI bridges climate science and frontline maternal health, right inside the   |
|   messaging app millions use every day. To explore our intelligence platform or       |
|   partner with us, visit dayli.ai."                                                   |
+---------------------------------------------------------------------------------------+
```

---

## How to Execute Voiceover via ElevenLabs MCP

If your client environment has the ElevenLabs MCP server connected:

1. **Call Tool:** `text_to_speech`
   - **Voice:** Rachel (`21m00Tcm4TlvDq8ikWAM`) or Bella (`EXAVITQu4vr4xnSDxMaL`)
   - **Model:** `eleven_multilingual_v2`
   - **Text:** Paste the respective scene script from `docs/video_documentation/scenes/scene_XX.txt`.
2. **Alternatively, Run the Standalone Script:**
   ```bash
   export ELEVENLABS_API_KEY="your_api_key"
   node docs/video_documentation/generate_elevenlabs_audio.js
   ```
   This will automatically generate `scene_01_hook_website.mp3` through `scene_07_call_to_action.mp3` and save them in `docs/video_documentation/audio/`.
