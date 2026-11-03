#!/usr/bin/env node

/**
 * generate_elevenlabs_audio.js
 * Generates ElevenLabs voiceovers for Dayli AI video documentation scenes.
 *
 * Usage:
 *   ELEVENLABS_API_KEY="your-key" node generate_elevenlabs_audio.js
 *   or have ELEVENLABS_API_KEY defined in your .env file.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env if present
const rootEnvPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(rootEnvPath)) {
  const envContent = fs.readFileSync(rootEnvPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [k, ...v] = trimmed.split('=');
    if (k && v && !process.env[k.trim()]) {
      process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
}

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error('\n❌ ERROR: ELEVENLABS_API_KEY is not set.');
  console.error('Please set it in your environment or in the .env file:');
  console.error('  export ELEVENLABS_API_KEY="your_api_key_here"\n');
  process.exit(1);
}

// Default premade system voices available on all tiers (including Free):
// "Xb7hH8MSUJpSbSDYk0k2" (Alice - clear, warm, professional female narrator)
// "JBFqnCBsd6RMkjVDRZzb" (George - warm, grounded male narrator)
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'Xb7hH8MSUJpSbSDYk0k2';
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';

const scenes = [
  {
    id: 'scene_01_hook_website',
    title: 'Scene 1: Hook & Website Overview',
    text: "Heat waves, poor air quality, and sudden weather shifts hit mothers and children first, yet guidance rarely reaches them where they are. Dayli AI is a climate health copilot that lives directly inside WhatsApp, so there is nothing new to download. Here is the website. It explains how Dayli AI works, how your data is protected with explicit consent, and gives you a single tap to connect right from your phone."
  },
  {
    id: 'scene_02_consent_onboarding',
    title: 'Scene 2: WhatsApp Consent & Onboarding',
    text: "Everything starts with consent. When a user says hi, Dayli AI explains what information is stored and asks for an explicit yes. You can opt out at any time just by typing 'stop'. It then asks only two simple questions: who the guidance is for, and where you are located. Every step is skippable, ensuring no one is ever locked out of asking an urgent health question."
  },
  {
    id: 'scene_03_climate_enrichment',
    title: 'Scene 3: Live Climate Enrichment & Context',
    text: "Once Dayli AI knows your general location, it automatically checks real-time weather and air quality from Open-Meteo. When a mother asks if it is safe to take her newborn outside, Dayli AI does not give generic advice. It evaluates today's heat index and PM 2.5 levels, translating complex environmental data into clear, protective actions tailored to her baby."
  },
  {
    id: 'scene_04_multilingual_voice_clinics',
    title: 'Scene 4: Multilingual, Voice Notes & Clinic Finder',
    text: "Care is most effective in your mother tongue. Dayli AI supports Hindi, Telugu, and Arabic seamlessly. Users can send voice notes when typing is difficult, and Dayli AI transcribes and responds back. And whenever physical examination is needed, the built-in clinic locator surfaces nearby healthcare centers in seconds."
  },
  {
    id: 'scene_05_clinical_safety',
    title: 'Scene 5: Deterministic Clinical Safety Engine',
    text: "Safety is never left to chance. Every single response passes through a deterministic clinical safety core before being dispatched. If a message contains red flags like infant respiratory distress or severe dehydration, Dayli AI immediately issues urgent escalation guidance. The underlying AI model cannot override these clinical guardrails."
  },
  {
    id: 'scene_06_dashboard_walkthrough',
    title: 'Scene 6: Intelligence & Surveillance Dashboard',
    text: "Behind the scenes, the Dayli AI dashboard provides public health teams with live population-level intelligence. Operators can monitor heat and air quality surveillance maps, track consent audit compliance, analyze symptom trends, and test conversational flows live in the observatory sandbox."
  },
  {
    id: 'scene_07_call_to_action',
    title: 'Scene 7: Outro & Call to Action',
    text: "Dayli AI bridges climate science and frontline maternal health, right inside the messaging app millions use every day. To explore our intelligence platform or partner with us, visit dayli.ai."
  }
];

const outputDir = path.resolve(__dirname, 'audio');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateTTS(scene) {
  const outFile = path.join(outputDir, `${scene.id}.mp3`);
  console.log(`\n🎙️  Generating [${scene.id}]...`);
  console.log(`   Voice: ${VOICE_ID} | Model: ${MODEL_ID}`);

  const payload = JSON.stringify({
    text: scene.text,
    model_id: MODEL_ID,
    voice_settings: {
      stability: 0.50,
      similarity_boost: 0.80,
      style: 0.15,
      use_speaker_boost: true
    }
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${VOICE_ID}`,
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        let errData = '';
        res.on('data', chunk => errData += chunk);
        res.on('end', () => {
          reject(new Error(`ElevenLabs API error (${res.statusCode}): ${errData}`));
        });
        return;
      }

      const fileStream = fs.createWriteStream(outFile);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`   ✅ Saved: ${outFile}`);

        // Try getting duration via afinfo (macOS) or ffprobe
        try {
          const duration = execSync(`afinfo "${outFile}" 2>/dev/null | awk -F': ' '/estimated duration/{print $2}' || ffprobe -i "${outFile}" -show_entries format=duration -v quiet -of csv="p=0"`).toString().trim();
          if (duration) {
            console.log(`   ⏱️  Duration: ~${duration}`);
          }
        } catch {
          // ignore duration lookup error
        }
        resolve(outFile);
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function run() {
  console.log('====================================================');
  console.log(' Dayli AI Voiceover Generator (ElevenLabs)');
  console.log('====================================================');
  console.log(`Output Directory: ${outputDir}`);
  console.log(`Total Scenes: ${scenes.length}`);

  for (const scene of scenes) {
    try {
      await generateTTS(scene);
      // Small pause to be polite with rate limits
      await new Promise(r => setTimeout(r, 600));
    } catch (err) {
      console.error(`   ❌ Failed to generate ${scene.id}:`, err.message);
    }
  }

  console.log('\n🎉 Finished generating voiceover audio files!');
  console.log(`Check files in: ${outputDir}`);
}

run();
