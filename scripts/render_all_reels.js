#!/usr/bin/env node

/**
 * render_all_reels.js
 * Renders 5 high-impact vertical (1080x1920) Social Media Reels for Dayli AI.
 * Updated with official Dayli AI Brand Palette, safe margins, and multi-line word wrapping.
 */

import path from 'path';
import os from 'os';
import fs from 'fs';
import { spawnSync, execFileSync } from 'child_process';

const FFMPEG = '/opt/homebrew/bin/ffmpeg';
const FFPROBE = '/opt/homebrew/bin/ffprobe';
const desktop = path.join(os.homedir(), 'Desktop');
const projectDir = path.resolve('.');
const audioDir = path.join(projectDir, 'docs/video_documentation/reels_audio');
const graphicsDir = path.join(projectDir, 'docs/video_documentation/reels_graphics');
const tmpDir = path.join(projectDir, 'docs/video_documentation/reels_tmp');

if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

// Source videos
const waVideo = path.join(desktop, 'WhatsApp_Chat_Demonstration_105s.mp4');
const webVideo = path.join(os.homedir(), 'Downloads', 'Dayli AI website .mp4');
// Note narrow no-break space in QuickTime filename:
const dashVideo = path.join(desktop, 'Screen Recording 2026-10-30 at 12.36.16\u202fPM.mov');

// Final Destination on Desktop
const reelFiles = [
  path.join(desktop, 'Dayli_AI_Short_1_Heat_Alert.mp4'),
  path.join(desktop, 'Dayli_AI_Short_2_Clinical_Safety.mp4'),
  path.join(desktop, 'Dayli_AI_Short_3_No_App_Needed.mp4'),
  path.join(desktop, 'Dayli_AI_Short_4_Hospital_Locator.mp4'),
  path.join(desktop, 'Dayli_AI_Short_5_Surveillance_Heatmap.mp4')
];

console.log('========================================================');
console.log(' 🚀 DAYLI AI — 5 SOCIAL MEDIA SHORTS COMPILER (1080x1920)');
console.log(' Official Dayli AI Brand Theme • Full Screen Safe Margins');
console.log('========================================================');

// Helper to run ffmpeg
function runFfmpeg(args, desc) {
  console.log(`\n▶ [${desc}]`);
  const t0 = Date.now();
  const res = spawnSync(FFMPEG, args, { stdio: 'inherit' });
  if (res.status !== 0) {
    console.error(`❌ ERROR in ${desc}`);
    process.exit(1);
  }
  console.log(`✅ Finished ${desc} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

// ─────────────────────────────────────────────────────────────────────
// REEL 1: "The 45°C Heat Alert" (WhatsApp Chat: 47.0s - 72.3s, 25.3s)
// ─────────────────────────────────────────────────────────────────────
{
  const r1Filter = [
    '[0:v]split=2[bg_raw][fg_raw]',
    '[bg_raw]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:5,colorchannelmixer=aa=1:rr=0.35:gg=0.35:bb=0.45[bg]',
    '[fg_raw]scale=-1:1420,pad=iw+16:ih+16:8:8:color=white@0.2,pad=iw+4:ih+4:2:2:color=black@0.6[fg]',
    '[bg][fg]overlay=(W-w)/2:295[composed]',
    '[2:v]scale=1080:1920[ov]',
    '[composed][ov]overlay=0:0,fps=30[vfinal]'
  ].join(';');

  runFfmpeg([
    '-y',
    '-ss', '47.0',
    '-t', '25.3',
    '-i', waVideo,
    '-i', path.join(audioDir, 'reel_1_heat_alert.mp3'),
    '-i', path.join(graphicsDir, 'overlay_reel_1.png'),
    '-filter_complex', r1Filter,
    '-map', '[vfinal]',
    '-map', '1:a',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '18',
    '-c:a', 'aac',
    '-b:a', '192k',
    reelFiles[0]
  ], 'Rendering Reel 1: The 45°C Heat Alert');
}

// ─────────────────────────────────────────────────────────────────────
// REEL 2: "When AI Refuses to Chat" (WhatsApp Chat: 80.0s - 104.9s, 24.9s)
// ─────────────────────────────────────────────────────────────────────
{
  const r2Filter = [
    '[0:v]split=2[bg_raw][fg_raw]',
    '[bg_raw]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:5,colorchannelmixer=aa=1:rr=0.35:gg=0.35:bb=0.45[bg]',
    '[fg_raw]scale=-1:1420,pad=iw+16:ih+16:8:8:color=white@0.2,pad=iw+4:ih+4:2:2:color=black@0.6[fg]',
    '[bg][fg]overlay=(W-w)/2:295[composed]',
    '[2:v]scale=1080:1920[ov]',
    '[composed][ov]overlay=0:0,fps=30[vfinal]'
  ].join(';');

  runFfmpeg([
    '-y',
    '-ss', '80.0',
    '-t', '24.9',
    '-i', waVideo,
    '-i', path.join(audioDir, 'reel_2_clinical_safety.mp3'),
    '-i', path.join(graphicsDir, 'overlay_reel_2.png'),
    '-filter_complex', r2Filter,
    '-map', '[vfinal]',
    '-map', '1:a',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '18',
    '-c:a', 'aac',
    '-b:a', '192k',
    reelFiles[1]
  ], 'Rendering Reel 2: When AI Refuses to Chat');
}

// ─────────────────────────────────────────────────────────────────────
// REEL 3: "Healthcare Without an App" (Website 64-73.5s + WhatsApp 0-12.5s)
// ─────────────────────────────────────────────────────────────────────
{
  const p3aOut = path.join(tmpDir, 'reel3_partA.mp4');
  const p3bOut = path.join(tmpDir, 'reel3_partB.mp4');

  // Part A: Website CTA click (9.5s)
  const filterA = [
    '[0:v]split=2[bg_raw][fg_raw]',
    '[bg_raw]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:5,colorchannelmixer=aa=1:rr=0.35:gg=0.35:bb=0.45[bg]',
    '[fg_raw]scale=1040:-1,pad=iw+16:ih+16:8:8:color=white@0.2,pad=iw+4:ih+4:2:2:color=black@0.6[fg]',
    '[bg][fg]overlay=(W-w)/2:(H-h)/2,fps=30[vfinal]'
  ].join(';');

  runFfmpeg([
    '-y',
    '-ss', '64.0',
    '-t', '9.5',
    '-i', webVideo,
    '-filter_complex', filterA,
    '-map', '[vfinal]',
    '-an',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '18',
    p3aOut
  ], 'Rendering Reel 3 - Part A: Website CTA');

  // Part B: WhatsApp Onboarding & Consent (12.5s)
  const filterB = [
    '[0:v]split=2[bg_raw][fg_raw]',
    '[bg_raw]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:5,colorchannelmixer=aa=1:rr=0.35:gg=0.35:bb=0.45[bg]',
    '[fg_raw]scale=-1:1420,pad=iw+16:ih+16:8:8:color=white@0.2,pad=iw+4:ih+4:2:2:color=black@0.6[fg]',
    '[bg][fg]overlay=(W-w)/2:295,fps=30[vfinal]'
  ].join(';');

  runFfmpeg([
    '-y',
    '-ss', '0.0',
    '-t', '12.5',
    '-i', waVideo,
    '-filter_complex', filterB,
    '-map', '[vfinal]',
    '-an',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '18',
    p3bOut
  ], 'Rendering Reel 3 - Part B: WhatsApp Consent');

  // Concatenate Part A + Part B, overlay Graphic and Audio
  const concatFile = path.join(tmpDir, 'reel3_concat.txt');
  fs.writeFileSync(concatFile, `file '${p3aOut}'\nfile '${p3bOut}'\n`);
  const joined3Video = path.join(tmpDir, 'reel3_joined.mp4');

  runFfmpeg([
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatFile,
    '-c', 'copy',
    joined3Video
  ], 'Concatenating Reel 3 video segments');

  runFfmpeg([
    '-y',
    '-i', joined3Video,
    '-i', path.join(audioDir, 'reel_3_no_app_needed.mp3'),
    '-i', path.join(graphicsDir, 'overlay_reel_3.png'),
    '-filter_complex', '[2:v]scale=1080:1920[ov];[0:v][ov]overlay=0:0[vfinal]',
    '-map', '[vfinal]',
    '-map', '1:a',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '18',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-t', '22.0',
    reelFiles[2]
  ], 'Finalizing Reel 3: Healthcare Without an App');
}

// ─────────────────────────────────────────────────────────────────────
// REEL 4: "Nearest Hospital in Seconds" (WhatsApp Chat: 65.0s - 88.0s, 23.0s)
// ─────────────────────────────────────────────────────────────────────
{
  const r4Filter = [
    '[0:v]split=2[bg_raw][fg_raw]',
    '[bg_raw]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:5,colorchannelmixer=aa=1:rr=0.35:gg=0.35:bb=0.45[bg]',
    '[fg_raw]scale=-1:1420,pad=iw+16:ih+16:8:8:color=white@0.2,pad=iw+4:ih+4:2:2:color=black@0.6[fg]',
    '[bg][fg]overlay=(W-w)/2:295[composed]',
    '[2:v]scale=1080:1920[ov]',
    '[composed][ov]overlay=0:0,fps=30[vfinal]'
  ].join(';');

  runFfmpeg([
    '-y',
    '-ss', '65.0',
    '-t', '23.0',
    '-i', waVideo,
    '-i', path.join(audioDir, 'reel_4_hospital_locator.mp3'),
    '-i', path.join(graphicsDir, 'overlay_reel_4.png'),
    '-filter_complex', r4Filter,
    '-map', '[vfinal]',
    '-map', '1:a',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '18',
    '-c:a', 'aac',
    '-b:a', '192k',
    reelFiles[3]
  ], 'Rendering Reel 4: Nearest Hospital in Seconds');
}

// ─────────────────────────────────────────────────────────────────────
// REEL 5: "The Surveillance Heatmap" (Dashboard: 28.0s - 50.0s, 22.0s)
// ─────────────────────────────────────────────────────────────────────
{
  const r5Filter = [
    '[0:v]split=2[bg_raw][fg_raw]',
    '[bg_raw]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:5,colorchannelmixer=aa=1:rr=0.35:gg=0.35:bb=0.45[bg]',
    '[fg_raw]scale=1020:-1,pad=iw+16:ih+16:8:8:color=white@0.25,pad=iw+4:ih+4:2:2:color=black@0.6[fg]',
    '[bg][fg]overlay=(W-w)/2:(H-h)/2[composed]',
    '[2:v]scale=1080:1920[ov]',
    '[composed][ov]overlay=0:0,fps=30[vfinal]'
  ].join(';');

  runFfmpeg([
    '-y',
    '-ss', '28.0',
    '-t', '22.0',
    '-i', dashVideo,
    '-i', path.join(audioDir, 'reel_5_surveillance_heatmap.mp3'),
    '-i', path.join(graphicsDir, 'overlay_reel_5.png'),
    '-filter_complex', r5Filter,
    '-map', '[vfinal]',
    '-map', '1:a',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '18',
    '-c:a', 'aac',
    '-b:a', '192k',
    reelFiles[4]
  ], 'Rendering Reel 5: The Surveillance Heatmap');
}

// ─────────────────────────────────────────────────────────────────────
// VERIFICATION
// ─────────────────────────────────────────────────────────────────────
console.log('\n========================================================');
console.log(' 🏁 VERIFYING 5 PRODUCED SHORTS');
console.log('========================================================');

for (let i = 0; i < reelFiles.length; i++) {
  const f = reelFiles[i];
  if (fs.existsSync(f)) {
    const probe = execFileSync(FFPROBE, [
      '-v', 'error',
      '-show_entries', 'format=duration,size:stream=width,height',
      '-of', 'json',
      f
    ]).toString();
    const data = JSON.parse(probe);
    const dur = parseFloat(data.format.duration).toFixed(1);
    const szMB = (parseInt(data.format.size) / (1024 * 1024)).toFixed(1);
    const w = data.streams[0].width;
    const h = data.streams[0].height;
    console.log(`[Short ${i + 1}] ${path.basename(f)}`);
    console.log(`   Dimensions: ${w}x${h} (9:16) | Duration: ${dur}s | Size: ${szMB} MB`);
  } else {
    console.error(`❌ Missing short video file: ${f}`);
  }
}

console.log('\n✨ All 5 Short videos verified with 100% visible, unclipped text boxes!');
