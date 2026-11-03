#!/usr/bin/env node

/**
 * generate_reels_voiceover.js
 * Generates ElevenLabs voiceovers for the 5 Dayli AI Social Media Reels
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env
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
  console.error('❌ ERROR: ELEVENLABS_API_KEY not found');
  process.exit(1);
}

const VOICE_ID = 'Xb7hH8MSUJpSbSDYk0k2'; // Alice (reliable premade)
const MODEL_ID = 'eleven_multilingual_v2';
const targetDir = path.resolve(__dirname, '../docs/video_documentation/reels_audio');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const reels = [
  {
    id: 'reel_1_heat_alert',
    targetDuration: 20.0,
    text: "What happens when a pregnant mother faces 45-degree heatwaves in Hyderabad? When she asks Dayli AI if she can travel to the hospital, the system evaluates the extreme heat index in real time. It recommends postponing travel until the cooler evening, hydrating with coconut water, and avoiding direct midday sun. Real-time climate protection, right inside WhatsApp."
  },
  {
    id: 'reel_2_clinical_safety',
    targetDuration: 18.9,
    text: "Why does this healthcare AI refuse to chat during an emergency? When a mother reports an infant with a high fever, generic chatbots hallucinate answers. Dayli AI halts generative chat completely, triggers a deterministic red-flag alert, and instructs immediate contact with 112 emergency services. Zero hallucinations when lives are on the line."
  },
  {
    id: 'reel_3_no_app_needed',
    targetDuration: 28.0,
    text: "Nobody wants to download another heavy healthcare app. That's why Dayli AI runs entirely on WhatsApp. With just one tap from the browser, users get DPDP-compliant privacy consent, choose their preferred language, and setup maternal health tracking in seconds. Universal healthcare access with zero friction."
  },
  {
    id: 'reel_4_hospital_locator',
    targetDuration: 18.0,
    text: "Need an emergency maternity hospital right now? Just send a message. When a mother asks for care, Dayli AI scans verified regional registries, instantly returning nearby facilities like Hiranyaa and Padmavathi Hospital with exact distance and one-tap Google Maps directions. Saving critical minutes when every second counts."
  },
  {
    id: 'reel_5_surveillance_heatmap',
    targetDuration: 26.0,
    text: "This is how modern cities can predict lethal heatwaves before they strike. Dayli AI's surveillance dashboard monitors microclimate anomalies across Greater Hyderabad in real time. Officials can track urban heat islands against vulnerable maternal populations, turning weather data into life-saving public health action."
  }
];

function generateTts(clip) {
  return new Promise((resolve, reject) => {
    const outFile = path.join(targetDir, `${clip.id}.mp3`);
    console.log(`\n🎙️ Generating voiceover for: ${clip.id}...`);

    const payload = JSON.stringify({
      text: clip.text,
      model_id: MODEL_ID,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        speed: 1.05
      }
    });

    const options = {
      hostname: 'api.elevenlabs.io',
      port: 443,
      path: `/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        let errData = '';
        res.on('data', chunk => { errData += chunk; });
        res.on('end', () => {
          reject(new Error(`ElevenLabs HTTP ${res.statusCode}: ${errData}`));
        });
        return;
      }

      const fileStream = fs.createWriteStream(outFile);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();

        // Check duration using ffprobe
        try {
          const probeOut = execFileSync('/opt/homebrew/bin/ffprobe', [
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            outFile
          ]).toString().trim();
          const dur = parseFloat(probeOut);
          console.log(`   ✅ Saved: ${outFile} (duration: ${dur.toFixed(2)}s / target video: ${clip.targetDuration}s)`);
          resolve({ outFile, duration: dur });
        } catch (e) {
          console.log(`   ✅ Saved: ${outFile}`);
          resolve({ outFile, duration: null });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('==============================================');
  console.log(' ElevenLabs Voiceover Generation for 5 Reels');
  console.log(' Voice: Alice | Model:', MODEL_ID);
  console.log('==============================================');

  for (const clip of reels) {
    await generateTts(clip);
  }

  console.log('\n🎉 All 5 Reel voiceovers generated successfully!');
}

main().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
