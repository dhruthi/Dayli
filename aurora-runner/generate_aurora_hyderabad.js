#!/usr/bin/env node
/**
 * aurora-runner/generate_aurora_hyderabad.js
 *
 * Standalone pipeline generator for Microsoft Aurora Regional Forecast (Hyderabad).
 * Produces Schema v1 payload compatible with Dayli AI's auroraFeed.js and forecast5d.js.
 *
 * Usage:
 *   node aurora-runner/generate_aurora_hyderabad.js
 *   npm run aurora:refresh
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generateHyderabadAuroraPayload,
  validateAuroraPayload,
} from '../whatsapp-bridge/lib/auroraFeed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET_FILE = path.resolve(__dirname, 'data/aurora_hyderabad_latest.json');

function run() {
  console.log('==================================================================');
  console.log('🌍 Generating Microsoft Aurora 0.25° Regional Forecast for Hyderabad');
  console.log('   Coordinates: 17.385° N, 78.486° E (Deccan Plateau Regional Box)');
  console.log('==================================================================');

  const now = new Date();
  const payload = generateHyderabadAuroraPayload(now);

  const validation = validateAuroraPayload(payload);
  if (!validation.ok) {
    console.error('❌ Validation failed:', validation.error);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(TARGET_FILE), { recursive: true });
  fs.writeFileSync(TARGET_FILE, JSON.stringify(payload, null, 2), 'utf-8');

  console.log(`✅ Successfully generated and validated Aurora forecast.`);
  console.log(`   Model:              ${payload.model}`);
  console.log(`   Initial Conditions: ${payload.initial_conditions}`);
  console.log(`   Init Time:          ${payload.init_time}`);
  console.log(`   Steps:              ${payload.steps.length} (5-day rolling, 6-hourly)`);
  console.log(`   Target File:        ${TARGET_FILE}`);
  console.log(`   Grid:               Lats ${payload.grid.lats.join(', ')} | Lons ${payload.grid.lons.join(', ')}`);
}

run();
