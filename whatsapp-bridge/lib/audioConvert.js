/**
 * lib/audioConvert.js
 *
 * Audio format plumbing for the voice pipeline. Two hard constraints drive it:
 *
 *   1. WhatsApp only accepts audio/aac, audio/amr, audio/mpeg, audio/mp4 and
 *      audio/ogg (Opus codec only). It REJECTS WAV and raw PCM — which is exactly
 *      what Bhashini IndicTTS and Gemini TTS return. Uploading WAV bytes labelled
 *      "audio/ogg" either fails at upload or arrives as an unplayable note.
 *      Only OGG/Opus renders as a proper voice note bubble.
 *
 *   2. Speech recognisers are most reliable on 16 kHz mono PCM WAV. WhatsApp
 *      voice notes arrive as OGG/Opus.
 *
 * ffmpeg does both conversions over stdin/stdout (no temp files). It is
 * installed in the production Docker image. When it is missing (e.g. a dev
 * laptop) every helper degrades gracefully and the caller falls back.
 */

import { spawn } from 'node:child_process';

const FFMPEG_TIMEOUT_MS = parseInt(process.env.FFMPEG_TIMEOUT_MS || '20000', 10);

function ffmpegPath() {
  return process.env.FFMPEG_PATH || 'ffmpeg';
}

let ffmpegAvailable = null; // cached Promise<boolean>

/** Whether an ffmpeg binary can be executed. Checked once, then cached. */
export function hasFfmpeg() {
  if (ffmpegAvailable) return ffmpegAvailable;
  ffmpegAvailable = new Promise((resolve) => {
    try {
      const proc = spawn(ffmpegPath(), ['-version'], { stdio: 'ignore' });
      proc.on('error', () => resolve(false));
      proc.on('close', (code) => resolve(code === 0));
    } catch {
      resolve(false);
    }
  });
  return ffmpegAvailable;
}

/** Test hook: forget the cached ffmpeg probe. */
export function _resetFfmpegCache() {
  ffmpegAvailable = null;
}

/**
 * Identify an audio container from its magic bytes.
 * @param {Buffer} buf
 * @returns {'ogg'|'wav'|'mp3'|'flac'|'unknown'}
 */
export function detectAudioFormat(buf) {
  if (!buf || buf.length < 4) return 'unknown';
  const head4 = buf.subarray(0, 4).toString('latin1');
  if (head4 === 'OggS') return 'ogg';
  if (head4 === 'RIFF') return 'wav';
  if (head4 === 'fLaC') return 'flac';
  if (buf.subarray(0, 3).toString('latin1') === 'ID3') return 'mp3';
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return 'mp3'; // MPEG frame sync
  return 'unknown';
}

/**
 * Pipe a buffer through ffmpeg and collect stdout.
 * @param {string[]} args - ffmpeg args; must read pipe:0 and write pipe:1
 * @param {Buffer} input
 * @returns {Promise<Buffer>}
 */
export function runFfmpeg(args, input) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath(), ['-hide_banner', '-loglevel', 'error', ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const out = [];
    let err = '';
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('ffmpeg timeout'));
    }, FFMPEG_TIMEOUT_MS);

    proc.stdout.on('data', (d) => out.push(d));
    proc.stderr.on('data', (d) => { err += d.toString(); });
    proc.on('error', (e) => { clearTimeout(timer); reject(e); });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0 && out.length) resolve(Buffer.concat(out));
      else reject(new Error(`ffmpeg exited ${code}: ${err.slice(0, 200)}`));
    });
    // EPIPE when ffmpeg exits early is reported via 'close'; don't crash.
    proc.stdin.on('error', () => {});
    proc.stdin.end(input);
  });
}

/** Any audio → 16 kHz mono 16-bit WAV (what ASR models are trained on). */
export function toWav16kMono(buffer) {
  return runFfmpeg(
    ['-i', 'pipe:0', '-ac', '1', '-ar', '16000', '-sample_fmt', 's16', '-f', 'wav', 'pipe:1'],
    buffer
  );
}

/**
 * Any audio (or raw PCM) → OGG/Opus mono, the only format WhatsApp renders
 * as a voice note.
 *
 * @param {Buffer} buffer
 * @param {{ rawPcmSampleRate?: number }} [opts] - set for headerless s16le PCM
 */
export function toOggOpus(buffer, { rawPcmSampleRate } = {}) {
  const input = rawPcmSampleRate
    ? ['-f', 's16le', '-ar', String(rawPcmSampleRate), '-ac', '1', '-i', 'pipe:0']
    : ['-i', 'pipe:0'];
  return runFfmpeg(
    [
      ...input,
      '-vn', '-ac', '1', '-ar', '48000',
      '-c:a', 'libopus', '-b:a', '32k', '-application', 'voip',
      '-f', 'ogg', 'pipe:1',
    ],
    buffer
  );
}
