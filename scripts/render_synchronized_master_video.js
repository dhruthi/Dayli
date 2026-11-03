#!/usr/bin/env node

/**
 * render_synchronized_master_video.js
 *
 * Perfectly aligns voiceover narration to on-screen video events:
 *  - Part 1: Website Walkthrough (74.5s) — 6 synced voiceover clips
 *  - Part 2: WhatsApp Chat (105.0s) — 6 synced voiceover clips
 *  - Part 3: Surveillance Dashboard (122.5s) — 5 synced voiceover clips
 */

import path from 'path';
import os from 'os';
import fs from 'fs';
import { spawnSync, execFileSync } from 'child_process';

const FFMPEG = '/opt/homebrew/bin/ffmpeg';
const desktop = path.join(os.homedir(), 'Desktop');
const audioDir = path.resolve('docs/video_documentation/synced_audio');
const outDir = path.resolve('docs/video_documentation/master_synced_output');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const webVideo = path.join(os.homedir(), 'Downloads', 'Dayli AI website .mp4');
const waVideo = path.join(desktop, 'WhatsApp_Chat_Demonstration_105s.mp4');
const dashVideo = path.join(desktop, 'Screen Recording 2026-10-30 at 12.36.16\u202fPM.mov');

const finalMasterVideo = path.join(desktop, 'Dayli_AI_Complete_Documentation_Master.mp4');

console.log('====================================================');
console.log(' Synchronized Master Video Documentation Stitcher');
console.log('====================================================');

// ── PART 1: WEBSITE (74.5s) ──────────────────────────────────────────
console.log('\n[1/4] Rendering Part 1: Website with 6 precisely timed clips...');
const p1Out = path.join(outDir, 'synced_part1_web.mp4');

const p1Args = [
  '-y',
  '-i', webVideo,
  '-i', path.join(audioDir, 'web_01_hero.mp3'),
  '-i', path.join(audioDir, 'web_02_pilot_stats.mp3'),
  '-i', path.join(audioDir, 'web_03_problem.mp3'),
  '-i', path.join(audioDir, 'web_04_how_it_works.mp3'),
  '-i', path.join(audioDir, 'web_05_features.mp3'),
  '-i', path.join(audioDir, 'web_06_whatsapp_cta.mp3'),
  '-filter_complex',
  '[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v];' +
  '[1:a]adelay=1000|1000[a1];' +
  '[2:a]adelay=13000|13000[a2];' +
  '[3:a]adelay=25000|25000[a3];' +
  '[4:a]adelay=37000|37000[a4];' +
  '[5:a]adelay=51000|51000[a5];' +
  '[6:a]adelay=64000|64000[a6];' +
  '[a1][a2][a3][a4][a5][a6]amix=inputs=6:dropout_transition=0:normalize=0[aout]',
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
  console.error('Failed on Part 1');
  process.exit(1);
}

// ── PART 2: WHATSAPP (105.0s) ────────────────────────────────────────
console.log('\n[2/4] Rendering Part 2: WhatsApp Chat with 6 precisely timed clips...');
const p2Out = path.join(outDir, 'synced_part2_wa.mp4');

const p2Args = [
  '-y',
  '-i', waVideo,
  '-i', path.join(audioDir, 'wa_01_consent.mp3'),
  '-i', path.join(audioDir, 'wa_02_profile.mp3'),
  '-i', path.join(audioDir, 'wa_03_location.mp3'),
  '-i', path.join(audioDir, 'wa_04_heat_query.mp3'),
  '-i', path.join(audioDir, 'wa_05_hospitals.mp3'),
  '-i', path.join(audioDir, 'wa_06_emergency_redflag.mp3'),
  '-filter_complex',
  '[0:v]split=2[bg][fg];' +
  '[bg]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,boxblur=20:5[bgblur];' +
  '[fg]scale=-1:1040[scaledfg];' +
  '[bgblur][scaledfg]overlay=(W-w)/2:(H-h)/2,setsar=1,fps=30[v];' +
  '[1:a]adelay=1000|1000[a1];' +
  '[2:a]adelay=18000|18000[a2];' +
  '[3:a]adelay=37000|37000[a3];' +
  '[4:a]adelay=50000|50000[a4];' +
  '[5:a]adelay=68000|68000[a5];' +
  '[6:a]adelay=86000|86000[a6];' +
  '[a1][a2][a3][a4][a5][a6]amix=inputs=6:dropout_transition=0:normalize=0[aout]',
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
  console.error('Failed on Part 2');
  process.exit(1);
}

// ── PART 3: SURVEILLANCE DASHBOARD (122.5s) ──────────────────────────
console.log('\n[3/4] Rendering Part 3: Dashboard with 5 precisely timed clips...');
const p3Out = path.join(outDir, 'synced_part3_dash.mp4');

const p3Args = [
  '-y',
  '-i', dashVideo,
  '-i', path.join(audioDir, 'dash_01_overview.mp3'),
  '-i', path.join(audioDir, 'dash_02_heatmap.mp3'),
  '-i', path.join(audioDir, 'dash_03_simulation.mp3'),
  '-i', path.join(audioDir, 'dash_04_maternity_hospitals.mp3'),
  '-i', path.join(audioDir, 'dash_05_compliance_outro.mp3'),
  '-filter_complex',
  '[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v];' +
  '[1:a]adelay=1000|1000[a1];' +
  '[2:a]adelay=28000|28000[a2];' +
  '[3:a]adelay=68000|68000[a3];' +
  '[4:a]adelay=92000|92000[a4];' +
  '[5:a]adelay=105000|105000[a5];' +
  '[a1][a2][a3][a4][a5]amix=inputs=5:dropout_transition=0:normalize=0[aout]',
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
  console.error('Failed on Part 3');
  process.exit(1);
}

// ── PART 4: CONCATENATE MASTER VIDEO ─────────────────────────────────
console.log('\n[4/4] Concatenating Master Video...');
const concatListFile = path.join(outDir, 'master_concat.txt');
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

console.log('\n🎉 SUCCESS! Fully Synchronized Master Documentation Video Produced:');
console.log('👉 ' + finalMasterVideo);
console.log(probe);
