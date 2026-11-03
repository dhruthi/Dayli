#!/usr/bin/env node

/**
 * Dayli AI — Complete 3-Part Master Video Documentation Stitcher
 *
 * Sequence:
 *  - Part 1: Website Walkthrough (74.5s) — Scene 1
 *  - Part 2: WhatsApp Chat Demonstration (105.0s) — Scenes 2, 3, 4, 5
 *  - Part 3: Surveillance Dashboard (122.5s) — Scenes 6 & 7
 *
 * Total Master Video Duration: ~302 seconds (~5 minutes)
 * Resolution: 1920x1080 (30fps Full HD)
 */

import path from 'path';
import os from 'os';
import fs from 'fs';
import { spawnSync, execFileSync } from 'child_process';

const FFMPEG = '/opt/homebrew/bin/ffmpeg';
const desktop = path.join(os.homedir(), 'Desktop');
const audioDir = path.resolve('docs/video_documentation/audio');
const outDir = path.resolve('docs/video_documentation/master_output');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const websiteVideo = path.join(os.homedir(), 'Downloads', 'Dayli AI website .mp4');
const whatsappVideo = path.join(desktop, 'WhatsApp_Chat_Demonstration_105s.mp4');
const dashboardVideo = path.join(desktop, 'Screen Recording 2026-10-30 at 12.36.16\u202fPM.mov');

const finalMasterVideo = path.join(desktop, 'Dayli_AI_Complete_Documentation_Master.mp4');

console.log('====================================================');
console.log(' Dayli AI 3-Part Master Documentation Video Stitcher');
console.log('====================================================');
console.log('Part 1 (Website):   ', websiteVideo);
console.log('Part 2 (WhatsApp):  ', whatsappVideo);
console.log('Part 3 (Dashboard): ', dashboardVideo);
console.log('Final Master Output:', finalMasterVideo);

// ── PART 1: Website Walkthrough (74.5s) ──────────────────────────────
console.log('\n[1/4] Processing Part 1: Dayli AI Website (74.5s)...');
const p1Out = path.join(outDir, 'master_part1_website.mp4');
const s1 = path.join(audioDir, 'scene_01_hook_website.mp3');

const p1Args = [
  '-y',
  '-i', websiteVideo,
  '-i', s1,
  '-filter_complex',
  '[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v];' +
  '[1:a]adelay=800|800[aout]',
  '-map', '[v]',
  '-map', '[aout]',
  '-c:v', 'libx264',
  '-preset', 'fast',
  '-crf', '18',
  '-c:a', 'aac',
  '-b:a', '192k',
  '-t', '74.5',
  p1Out
];

const res1 = spawnSync(FFMPEG, p1Args, { stdio: 'inherit' });
if (res1.status !== 0) {
  console.error('Failed to render Part 1');
  process.exit(1);
}

// ── PART 2: WhatsApp Chat Demonstration (105.0s) ────────────────────
console.log('\n[2/4] Processing Part 2: WhatsApp Mobile Chat Demonstration (105.0s)...');
const p2Out = path.join(outDir, 'master_part2_whatsapp.mp4');
const s2 = path.join(audioDir, 'scene_02_consent_onboarding.mp3');
const s3 = path.join(audioDir, 'scene_03_climate_enrichment.mp3');
const s4 = path.join(audioDir, 'scene_04_multilingual_voice_clinics.mp3');
const s5 = path.join(audioDir, 'scene_05_clinical_safety.mp3');

// Video: Centered phone layout with blurred background at 1920x1080
// Audio:
//  - Scene 2 (Consent & Profile) at t=1.0s
//  - Scene 3 (Climate & Heat Query) at t=29.0s
//  - Scene 4 (Clinic / Hospital Finder) at t=57.0s
//  - Scene 5 (Clinical Safety Red Flag) at t=80.0s
const p2Args = [
  '-y',
  '-i', whatsappVideo,
  '-i', s2,
  '-i', s3,
  '-i', s4,
  '-i', s5,
  '-filter_complex',
  '[0:v]split=2[bg][fg];' +
  '[bg]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,boxblur=20:5[bgblur];' +
  '[fg]scale=-1:1040[scaledfg];' +
  '[bgblur][scaledfg]overlay=(W-w)/2:(H-h)/2,setsar=1,fps=30[v];' +
  '[1:a]adelay=1000|1000[a2];' +
  '[2:a]adelay=29000|29000[a3];' +
  '[3:a]adelay=57000|57000[a4];' +
  '[4:a]adelay=80000|80000[a5];' +
  '[a2][a3][a4][a5]amix=inputs=4:dropout_transition=0:normalize=0[aout]',
  '-map', '[v]',
  '-map', '[aout]',
  '-c:v', 'libx264',
  '-preset', 'fast',
  '-crf', '18',
  '-c:a', 'aac',
  '-b:a', '192k',
  '-t', '105.0',
  p2Out
];

const res2 = spawnSync(FFMPEG, p2Args, { stdio: 'inherit' });
if (res2.status !== 0) {
  console.error('Failed to render Part 2');
  process.exit(1);
}

// ── PART 3: Surveillance Dashboard (122.5s) ─────────────────────────
console.log('\n[3/4] Processing Part 3: Surveillance Dashboard (122.5s)...');
const p3Out = path.join(outDir, 'master_part3_dashboard.mp4');
const s6 = path.join(audioDir, 'scene_06_dashboard_walkthrough.mp3');
const s7 = path.join(audioDir, 'scene_07_call_to_action.mp3');

// Audio:
//  - Scene 6 (Dashboard Walkthrough) at t=1.5s
//  - Scene 7 (Call to Action / Outro) at t=95.0s
const p3Args = [
  '-y',
  '-i', dashboardVideo,
  '-i', s6,
  '-i', s7,
  '-filter_complex',
  '[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v];' +
  '[1:a]adelay=1500|1500[a6];' +
  '[2:a]adelay=95000|95000[a7];' +
  '[a6][a7]amix=inputs=2:dropout_transition=0:normalize=0[aout]',
  '-map', '[v]',
  '-map', '[aout]',
  '-c:v', 'libx264',
  '-preset', 'fast',
  '-crf', '18',
  '-c:a', 'aac',
  '-b:a', '192k',
  '-t', '122.5',
  p3Out
];

const res3 = spawnSync(FFMPEG, p3Args, { stdio: 'inherit' });
if (res3.status !== 0) {
  console.error('Failed to render Part 3');
  process.exit(1);
}

// ── PART 4: Concatenate All 3 Parts ─────────────────────────────────
console.log('\n[4/4] Joining all 3 parts into Master Documentation Video...');
const concatListFile = path.join(outDir, 'master_concat_list.txt');
fs.writeFileSync(concatListFile, `file '${p1Out}'\nfile '${p2Out}'\nfile '${p3Out}'\n`);

const p4Args = [
  '-y',
  '-f', 'concat',
  '-safe', '0',
  '-i', concatListFile,
  '-c', 'copy',
  finalMasterVideo
];

const res4 = spawnSync(FFMPEG, p4Args, { stdio: 'inherit' });
if (res4.status !== 0) {
  console.error('Failed to concatenate master video');
  process.exit(1);
}

const probe = execFileSync('/opt/homebrew/bin/ffprobe', [
  '-v', 'error',
  '-show_entries', 'format=duration,size',
  '-of', 'json',
  finalMasterVideo
]).toString();

console.log('\n🎉 SUCCESS! Complete Master Documentation Video Produced:');
console.log('👉 ' + finalMasterVideo);
console.log(probe);
