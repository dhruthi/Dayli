#!/usr/bin/env node

/**
 * Dayli AI — WhatsApp Chat Video Trimmer
 *
 * Trims out idle delays, long pauses, and static tail from the 205s raw recording,
 * producing a concise ~1:45 (105s) showcase preserving complete clinical context:
 *  - 1. Consent & Profile Onboarding (0:00 - 0:50)
 *  - 2. Climate & Heat Guidance (1:24 - 1:42)
 *  - 3. Clinic & Hospital Finder (1:58 - 2:16)
 *  - 4. Emergency Clinical Safety Engine Red Flag (2:45 - 3:04)
 */

import path from 'path';
import os from 'os';
import fs from 'fs';
import { spawnSync, execFileSync } from 'child_process';

const FFMPEG = '/opt/homebrew/bin/ffmpeg';
const desktop = path.join(os.homedir(), 'Desktop');
const rawVideo = '/Users/yashwanthnayak/Downloads/WhatsApp Video 2026-11-02 at 15.51.33.mp4';
const outDir = path.resolve('docs/video_documentation/whatsapp_trimmed');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const finalTrimmedVideo = path.join(desktop, 'WhatsApp_Chat_Demonstration_105s.mp4');

console.log('====================================================');
console.log(' Dayli AI WhatsApp Chat Video Trimmer');
console.log('====================================================');
console.log('Raw Video Input: ', rawVideo);
console.log('Target Duration: ~105s (1:45)');
console.log('Final Output:    ', finalTrimmedVideo);

// Filter complex to cleanly cut and join the 4 segments with preserved audio/video sync
const filterComplex = [
  '[0:v]trim=start=0:end=50,setpts=PTS-STARTPTS[v1];',
  '[0:a]atrim=start=0:end=50,asetpts=PTS-STARTPTS[a1];',
  '[0:v]trim=start=84:end=102,setpts=PTS-STARTPTS[v2];',
  '[0:a]atrim=start=84:end=102,asetpts=PTS-STARTPTS[a2];',
  '[0:v]trim=start=118:end=136,setpts=PTS-STARTPTS[v3];',
  '[0:a]atrim=start=118:end=136,asetpts=PTS-STARTPTS[a3];',
  '[0:v]trim=start=165:end=184,setpts=PTS-STARTPTS[v4];',
  '[0:a]atrim=start=165:end=184,asetpts=PTS-STARTPTS[a4];',
  '[v1][a1][v2][a2][v3][a3][v4][a4]concat=n=4:v=1:a=1[outv][outa]'
].join('');

const args = [
  '-y',
  '-i', rawVideo,
  '-filter_complex', filterComplex,
  '-map', '[outv]',
  '-map', '[outa]',
  '-c:v', 'libx264',
  '-preset', 'fast',
  '-crf', '18',
  '-c:a', 'aac',
  '-b:a', '192k',
  finalTrimmedVideo
];

console.log('\nProcessing video cut...');
const res = spawnSync(FFMPEG, args, { stdio: 'inherit' });

if (res.status !== 0) {
  console.error('Failed to trim video.');
  process.exit(1);
}

// Probe final output duration
const probe = execFileSync('/opt/homebrew/bin/ffprobe', [
  '-v', 'error',
  '-show_entries', 'format=duration,size',
  '-of', 'json',
  finalTrimmedVideo
]).toString();

console.log('\n🎉 Trimmed Video Created Successfully!');
console.log(probe);
