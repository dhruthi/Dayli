import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectSpeechLanguage,
  cleanTextForTTS,
  buildVoiceReply,
  translateTextToEnglish,
} from '../lib/voice.js';
import { _resetFfmpegCache } from '../lib/audioConvert.js';

describe('Multilingual Voice Assistance Pipeline', () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = { ...envBackup };
    _resetFfmpegCache();
  });

  afterEach(() => {
    process.env = { ...envBackup };
    _resetFfmpegCache();
    vi.restoreAllMocks();
  });

  it('accurately identifies Indic and Arabic scripts', () => {
    expect(detectSpeechLanguage('నా బిడ్డకు నిన్నటి నుండి జ్వరం ఉంది', 'en')).toBe('te');
    expect(detectSpeechLanguage('मेरे बच्चे को तेज बुखार है', 'en')).toBe('hi');
    expect(detectSpeechLanguage('طفلي يعاني من حمى شديدة منذ الأمس', 'ar')).toBe('ar');
    expect(detectSpeechLanguage('My baby has a high fever and is crying', 'te')).toBe('en');
  });

  it('strips markdown, links, and formatting symbols for natural voice synthesis', () => {
    const raw = '# Urgent Care\n* Stay hydrated with [ORSL](https://example.com)\n* **Do not** give plain water under 6 months.';
    const cleaned = cleanTextForTTS(raw);
    expect(cleaned).not.toContain('#');
    expect(cleaned).not.toContain('*');
    expect(cleaned).not.toContain('https://');
    expect(cleaned).toContain('Stay hydrated with ORSL');
    expect(cleaned).toContain('Do not give plain water under 6 months.');
  });

  it('prioritizes ElevenLabs Multilingual v2 for voiceover when API key is provided', async () => {
    process.env.ELEVENLABS_API_KEY = 'test_key';
    const mockAudio = Buffer.from('OggS-elevenlabs-opus-stream');
    const exactArrayBuffer = mockAudio.buffer.slice(
      mockAudio.byteOffset,
      mockAudio.byteOffset + mockAudio.byteLength
    );

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(exactArrayBuffer),
    });

    const reply = await buildVoiceReply('మీ బిడ్డకు పాలు మాత్రమే ఇవ్వండి', 'te');
    expect(reply).not.toBeNull();
    expect(reply?.provider).toBe('elevenlabs');
    expect(reply?.lang).toBe('te');
  });

  it('handles Latin-only text directly without redundant translation call', async () => {
    const res = await translateTextToEnglish('My baby has a high fever since yesterday');
    expect(res).toBe('My baby has a high fever since yesterday');
  });
});
