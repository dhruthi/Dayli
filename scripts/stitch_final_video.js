#!/usr/bin/env node

/**
 * Dayli AI — Automated Video Documentation Stitcher
 *
 * Synchronizes:
 *  - Website Screen Recording (88s) with ElevenLabs Scenes 1, 2, 3
 *  - Dashboard Screen Recording (122s) with ElevenLabs Scenes 6, 4, 5, 7
 *
 * Scales both to 1080p (1920x1080, 30fps), mutes background fan/mic noise,
 * and exports a broadcast-ready final MP4 to the user's Desktop.
 */

import path from 'path';
import os from 'os';
import fs from 'fs';
import { execFileSync, spawnSync } from 'child_process';

const FFMPEG = '/opt/homebrew/bin/ffmpeg';
const desktop = path.join(os.homedir(), 'Desktop');
const audioDir = path.resolve('docs/video_documentation/audio');
const outDir = path.resolve('docs/video_documentation/output');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const websiteVideo = path.join(os.homedir(), 'Downloads', 'Dayli AI website .mp4');
const dashboardVideo = path.join(desktop, 'Screen Recording 2026-10-30 at 12.36.16\u202fPM.mov');

const finalOutput = path.join(desktop, 'Dayli_AI_Video_Documentation_Final.mp4');

console.log('====================================================');
console.log(' Dayli AI Video Documentation Stitcher (FFmpeg)');
console.log('====================================================');
console.log('Website input:  ', websiteVideo);
console.log('Dashboard input:', dashboardVideo);
console.log('Final output:   ', finalOutput);

// Part 1: Process Website Video (74.57s) with Scenes 1 & 2
console.log('\n[1/3] Assembling Part 1: Dayli AI Website Walkthrough (74.5s)...');
const s1 = path.join(audioDir, 'scene_01_hook_website.mp3');
const s2 = path.join(audioDir, 'scene_02_consent_onboarding.mp3');

const part1Out = path.join(outDir, 'part1_website_voiced.mp4');

// Video 1 filter:
// - Scale to 1920x1080 (30fps)
// - Audio: Scene 1 at t=0.8s, Scene 2 at t=32.0s
const p1Args = [
  '-y',
  '-i', websiteVideo,
  '-i', s1,
  '-i', s2,
  '-filter_complex',
  '[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v];' +
  '[1:a]adelay=800|800[a1];' +
  '[2:a]adelay=32000|32000[a2];' +
  '[a1][a2]amix=inputs=2:dropout_transition=0:normalize=0[aout]',
  '-map', '[v]',
  '-map', '[aout]',
  '-c:v', 'libx264',
  '-preset', 'fast',
  '-crf', '18',
  '-c:a', 'aac',
  '-b:a', '192k',
  '-t', '74.5',
  part1Out
];

const res1 = spawnSync(FFMPEG, p1Args, { stdio: 'inherit' });
if (res1.status !== 0) {
  console.error('Failed to render Part 1');
  process.exit(1);
}

// Part 2: Process Dashboard Video (122.5s) with Scenes 6, 3, 4, 5, 7
console.log('\n[2/3] Assembling Part 2: Surveillance Dashboard & Clinical Intelligence (122.5s)...');
const s6 = path.join(audioDir, 'scene_06_dashboard_walkthrough.mp3');
const s3 = path.join(audioDir, 'scene_03_climate_enrichment.mp3');
const s4 = path.join(audioDir, 'scene_04_multilingual_voice_clinics.mp3');
const s5 = path.join(audioDir, 'scene_05_clinical_safety.mp3');
const s7 = path.join(audioDir, 'scene_07_call_to_action.mp3');

const part2Out = path.join(outDir, 'part2_dashboard_voiced.mp4');

// Video 2 filter:
// - Audio: Scene 6 at t=1.0s, Scene 3 at t=23.0s, Scene 4 at t=52.0s, Scene 5 at t=77.0s, Scene 7 at t=105.0s
const p2Args = [
  '-y',
  '-i', dashboardVideo,
  '-i', s6,
  '-i', s3,
  '-i', s4,
  '-i', s5,
  '-i', s7,
  '-filter_complex',
  '[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v];' +
  '[1:a]adelay=1000|1000[a6];' +
  '[2:a]adelay=23000|23000[a3];' +
  '[3:a]adelay=52000|52000[a4];' +
  '[4:a]adelay=77000|77000[a5];' +
  '[5:a]adelay=105000|105000[a7];' +
  '[a6][a3][a4][a5][a7]amix=inputs=5:dropout_transition=0:normalize=0[aout]',
  '-map', '[v]',
  '-map', '[aout]',
  '-c:v', 'libx264',
  '-preset', 'fast',
  '-crf', '18',
  '-c:a', 'aac',
  '-b:a', '192k',
  '-t', '122.5',
  part2Out
];

const res2 = spawnSync(FFMPEG, p2Args, { stdio: 'inherit' });
if (res2.status !== 0) {
  console.error('Failed to render Part 2');
  process.exit(1);
}

// Part 3: Concatenate Part 1 and Part 2 into final MP4
console.log('\n[3/3] Joining segments into Master Documentation Video...');
const concatListFile = path.join(outDir, 'concat_list.txt');
fs.writeFileSync(concatListFile, `file '${part1Out}'\nfile '${part2Out}'\n`);

const p3Args = [
  '-y',
  '-f', 'concat',
  '-safe', '0',
  '-i', concatListFile,
  '-c', 'copy',
  finalOutput
];

const res3 = spawnSync(FFMPEG, p3Args, { stdio: 'inherit' });
if (res3.status !== 0) {
  console.error('Failed to concatenate final video');
  process.exit(1);
}

console.log('\n🎉 SUCCESS! Master video documentation produced:');
console.log('👉 ' + finalOutput);
