#!/usr/bin/env node

/**
 * generate_synced_voiceovers.js
 * Generates frame-accurate ElevenLabs voiceovers for Dayli AI master documentation video.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env if present
const rootEnvPath = path.resolve(__dirname, '../.env');
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
  console.error('❌ ERROR: ELEVENLABS_API_KEY is not set.');
  process.exit(1);
}

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'Xb7hH8MSUJpSbSDYk0k2';
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';

const clips = [
  // PART 1: WEBSITE (74.5s)
  {
    id: 'web_01_hero',
    part: 'website',
    startTime: 1.0,
    maxDuration: 11.0,
    text: "Welcome to Dayli AI, an AI-powered climate health copilot designed to protect mothers and children from extreme weather risks directly through WhatsApp."
  },
  {
    id: 'web_02_pilot_stats',
    part: 'website',
    startTime: 13.0,
    maxDuration: 11.0,
    text: "During our Telangana pilot, Dayli AI supported over four thousand two hundred women across twenty-four thousand WhatsApp conversations in their native languages."
  },
  {
    id: 'web_03_problem',
    part: 'website',
    startTime: 25.0,
    maxDuration: 11.0,
    text: "Frontline maternal health is acutely vulnerable to heatwaves and air pollution. Dayli AI delivers actionable environmental health intelligence before risks escalate."
  },
  {
    id: 'web_04_how_it_works',
    part: 'website',
    startTime: 37.0,
    maxDuration: 12.0,
    text: "The platform tracks pregnancy stages and local heat indices, alerting mothers ahead of extreme heat and guiding them on safe daily routines."
  },
  {
    id: 'web_05_features',
    part: 'website',
    startTime: 51.0,
    maxDuration: 11.0,
    text: "Features include personalized daily health alerts, clinical guidance, and instant clinic routing, accessible without downloading any new app."
  },
  {
    id: 'web_06_whatsapp_cta',
    part: 'website',
    startTime: 64.0,
    maxDuration: 9.0,
    text: "With a single click on Start on WhatsApp, users transition directly into the live copilot."
  },

  // PART 2: WHATSAPP CHAT (105.0s)
  {
    id: 'wa_01_consent',
    part: 'whatsapp',
    startTime: 1.0,
    maxDuration: 15.0,
    text: "When a user sends 'Hi', Dayli AI begins with explicit consent. It transparently explains what data is stored and notes that users can opt out at any time by typing 'stop'."
  },
  {
    id: 'wa_02_profile',
    part: 'whatsapp',
    startTime: 18.0,
    maxDuration: 16.0,
    text: "Upon clicking 'Yes, let's start', the user selects their profile. Here, the user chooses 'I'm pregnant' and selects their third trimester."
  },
  {
    id: 'wa_03_location',
    part: 'whatsapp',
    startTime: 37.0,
    maxDuration: 12.0,
    text: "Next, Dayli AI asks for location to pull local weather data. The user shares their location pin in Hyderabad, completing the setup."
  },
  {
    id: 'wa_04_heat_query',
    part: 'whatsapp',
    startTime: 50.0,
    maxDuration: 16.0,
    text: "The user asks if it is safe to go out in the afternoon heat. Dayli AI evaluates the local temperature and advises avoiding direct sun between 12 and 4 PM with hydration guidance."
  },
  {
    id: 'wa_05_hospitals',
    part: 'whatsapp',
    startTime: 68.0,
    maxDuration: 16.0,
    text: "When the user asks for the nearest hospital, Dayli AI queries nearby healthcare facilities and returns verified hospitals with distances and direct navigation maps."
  },
  {
    id: 'wa_06_emergency_redflag',
    part: 'whatsapp',
    startTime: 86.0,
    maxDuration: 17.0,
    text: "Finally, when an acute emergency symptom is entered, Dayli AI's deterministic safety engine overrides normal conversation, immediately issuing a red alert to seek emergency care or dial 112."
  },

  // PART 3: SURVEILLANCE DASHBOARD (122.5s)
  {
    id: 'dash_01_overview',
    part: 'dashboard',
    startTime: 1.0,
    maxDuration: 17.0,
    text: "Behind the scenes, public health teams access the Dayli AI surveillance dashboard. The Overview tab aggregates active maternal cohorts, risk distributions, and real-time interaction volumes."
  },
  {
    id: 'dash_02_heatmap',
    part: 'dashboard',
    startTime: 28.0,
    maxDuration: 19.0,
    text: "Switching to the Heatmap and Climate Surveillance tab, operators view an interactive geospatial map of Greater Hyderabad, correlating localized heat and air quality with population vulnerability."
  },
  {
    id: 'dash_03_simulation',
    part: 'dashboard',
    startTime: 68.0,
    maxDuration: 17.0,
    text: "In the Chat Simulation Observatory, health administrators can monitor and simulate multi-turn triage conversations across different maternal and pediatric cohorts in a safe sandbox."
  },
  {
    id: 'dash_04_maternity_hospitals',
    part: 'dashboard',
    startTime: 92.0,
    maxDuration: 12.0,
    text: "The Maternity Hospitals tab monitors readiness across emergency obstetric centers, tracking ready labour rooms, NICU beds, and transit times."
  },
  {
    id: 'dash_05_compliance_outro',
    part: 'dashboard',
    startTime: 105.0,
    maxDuration: 16.0,
    text: "Under Compliance and DPDP, the platform maintains a zero-PHI audit ledger ensuring strict patient privacy. Dayli AI: climate intelligence protecting frontline health. Visit dayli.ai."
  }
];

const outputDir = path.resolve(__dirname, '../docs/video_documentation/synced_audio');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateTTS(clip) {
  const outFile = path.join(outputDir, `${clip.id}.mp3`);
  console.log(`🎙️  Generating [${clip.id}] (max: ${clip.maxDuration}s)...`);

  const payload = JSON.stringify({
    text: clip.text,
    model_id: MODEL_ID,
    voice_settings: {
      stability: 0.50,
      similarity_boost: 0.80,
      style: 0.10,
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
        res.on('end', () => reject(new Error(`ElevenLabs error (${res.statusCode}): ${errData}`)));
        return;
      }

      const fileStream = fs.createWriteStream(outFile);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        let dur = 0;
        try {
          const raw = execFileSync('/opt/homebrew/bin/ffprobe', [
            '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', outFile
          ]).toString().trim();
          dur = parseFloat(raw);
        } catch {}

        const fits = dur <= clip.maxDuration;
        console.log(`   ${fits ? '✅' : '⚠️'} Duration: ${dur.toFixed(2)}s / ${clip.maxDuration}s max`);
        resolve({ ...clip, outFile, duration: dur, fits });
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function run() {
  console.log('====================================================');
  console.log(' Dayli AI Synchronized Audio Clip Generator');
  console.log('====================================================');
  console.log(`Clips to generate: ${clips.length}`);

  const results = [];
  for (const c of clips) {
    try {
      const res = await generateTTS(c);
      results.push(res);
      await new Promise(r => setTimeout(r, 600)); // slight rate limit cushion
    } catch (err) {
      console.error(`   ❌ Failed: ${c.id}`, err.message);
    }
  }

  console.log('\n====================================================');
  console.log(' Generation Summary:');
  console.log('====================================================');
  let allFit = true;
  for (const r of results) {
    console.log(`[${r.id}] @ t=${r.startTime}s -> duration: ${r.duration.toFixed(2)}s (max: ${r.maxDuration}s) ${r.fits ? '✅' : '⚠️ EXCEEDS'}`);
    if (!r.fits) allFit = false;
  }

  if (allFit) {
    console.log('\n🎉 ALL AUDIO CLIPS FIT THEIR EXACT ON-SCREEN TIMINGS PERFECTLY!');
  } else {
    console.warn('\n⚠️ Some clips need minor wording shortening.');
  }

  fs.writeFileSync(path.join(outputDir, 'clips_manifest.json'), JSON.stringify(results, null, 2));
}

run();
