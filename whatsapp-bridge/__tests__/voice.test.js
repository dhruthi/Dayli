import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectSpeechLanguage, toWhatsAppAudio, buildVoiceReply, isVoiceReplyEnabled } from '../lib/voice.js';
import { detectAudioFormat, _resetFfmpegCache } from '../lib/audioConvert.js';

describe('voice orchestration (lib/voice.js)', () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    _resetFfmpegCache();
    process.env.FFMPEG_PATH = '/nonexistent/ffmpeg'; // simulate a host without ffmpeg
  });

  afterEach(() => {
    process.env = { ...envBackup };
    _resetFfmpegCache();
    vi.restoreAllMocks();
  });

  it('picks the TTS language from the reply script, not the profile', () => {
    expect(detectSpeechLanguage('మీ బిడ్డను నీడలో ఉంచండి', 'en')).toBe('te');
    expect(detectSpeechLanguage('बच्चे को छाँव में रखें', 'te')).toBe('hi');
    expect(detectSpeechLanguage('Keep the baby in the shade', 'te')).toBe('en');
    expect(detectSpeechLanguage('👍', 'hi')).toBe('hi');
  });

  it('identifies audio containers by magic bytes', () => {
    expect(detectAudioFormat(Buffer.from('OggS....'))).toBe('ogg');
    expect(detectAudioFormat(Buffer.from('RIFF....'))).toBe('wav');
    expect(detectAudioFormat(Buffer.from('ID3.....'))).toBe('mp3');
    expect(detectAudioFormat(Buffer.from([0x00, 0x01, 0x02, 0x03]))).toBe('unknown');
  });

  it('passes OGG through untouched', async () => {
    const out = await toWhatsAppAudio(Buffer.from('OggS-opus-bytes'));
    expect(out.mimeType).toBe('audio/ogg');
  });

  it('refuses to hand WAV to WhatsApp when ffmpeg is missing', async () => {
    expect(await toWhatsAppAudio(Buffer.from('RIFF-wav-bytes'))).toBeNull();
  });

  it('falls back to MP3 as audio/mpeg without ffmpeg', async () => {
    const out = await toWhatsAppAudio(Buffer.from('ID3-mp3-bytes'));
    expect(out.mimeType).toBe('audio/mpeg');
  });

  it('can be switched off', async () => {
    process.env.VOICE_REPLY_ENABLED = 'false';
    expect(isVoiceReplyEnabled()).toBe(false);
    expect(await buildVoiceReply('hello there', 'en')).toBeNull();
  });

  it('returns null (never throws) when no engine can produce playable audio', async () => {
    delete process.env.BHASHINI_API_KEY;
    delete process.env.BHASHINI_USER_ID;
    delete process.env.BHASHINI_INFERENCE_API_KEY;
    process.env.GEMINI_API_KEY = 'k';
    global.fetch = vi.fn();
    expect(await buildVoiceReply('Keep the baby cool', 'en')).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled(); // Gemini TTS skipped: PCM is unplayable without ffmpeg
  });
});
