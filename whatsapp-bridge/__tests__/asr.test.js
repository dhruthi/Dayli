import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { transcribeVoiceNote } from '../lib/asr.js';
import { CloudApiClient } from '../lib/cloudApi.js';

describe('Voice ASR Transcription via Gemini 2.0 Flash', () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.GEMINI_API_KEY = originalKey;
    vi.restoreAllMocks();
  });

  it('returns null if audio buffer is empty', async () => {
    const result = await transcribeVoiceNote(Buffer.from([]), 'audio/ogg', 'en');
    expect(result).toBeNull();
  });

  it('returns null if GEMINI_API_KEY is not configured', async () => {
    process.env.GEMINI_API_KEY = '';
    const fakeBuffer = Buffer.from('fake-audio-bytes');
    const result = await transcribeVoiceNote(fakeBuffer, 'audio/ogg', 'te');
    expect(result).toBeNull();
  });

  it('correctly constructs payload with inlineData and returns transcript', async () => {
    const fakeAudio = Buffer.from('fake-audio-content');
    let capturedUrl = '';
    let capturedBody = null;

    global.fetch = vi.fn(async (url, options) => {
      capturedUrl = url;
      capturedBody = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'నా బిడ్డకు జ్వరం వచ్చింది' }],
              },
            },
          ],
        }),
      };
    });

    const transcript = await transcribeVoiceNote(fakeAudio, 'audio/ogg; codecs=opus', 'te');

    expect(transcript).toBe('నా బిడ్డకు జ్వరం వచ్చింది');
    expect(capturedUrl).toContain('models/gemini-2.0-flash:generateContent');
    expect(capturedUrl).toContain('key=test-gemini-key');

    // Check payload structure
    const part = capturedBody.contents[0].parts;
    expect(part[0].text).toContain('Telugu');
    expect(part[1].inlineData.mimeType).toBe('audio/ogg');
    expect(part[1].inlineData.data).toBe(fakeAudio.toString('base64'));
    expect(capturedBody.generationConfig.temperature).toBe(0);
  });

  it('applies language hints for Hindi and English', async () => {
    const fakeAudio = Buffer.from('fake-audio');
    let lastPromptText = '';

    global.fetch = vi.fn(async (url, options) => {
      const body = JSON.parse(options.body);
      lastPromptText = body.contents[0].parts[0].text;
      return {
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'नमस्ते' }] } }],
        }),
      };
    });

    await transcribeVoiceNote(fakeAudio, 'audio/ogg', 'hi');
    expect(lastPromptText).toContain('Hindi');

    await transcribeVoiceNote(fakeAudio, 'audio/ogg', 'en');
    expect(lastPromptText).toContain('English');
  });

  it('handles Gemini API error (non-ok response) gracefully', async () => {
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 401,
      text: async () => 'API key invalid',
    }));

    const result = await transcribeVoiceNote(Buffer.from('audio'), 'audio/ogg', 'en');
    expect(result).toBeNull();
  });

  it('handles network failure or timeout gracefully', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('Network timeout');
    });

    const result = await transcribeVoiceNote(Buffer.from('audio'), 'audio/ogg', 'en');
    expect(result).toBeNull();
  });
});

describe('CloudApiClient.downloadMedia', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('throws if CloudApiClient is not configured', async () => {
    const client = new CloudApiClient({ accessToken: '', phoneNumberId: '' });
    await expect(client.downloadMedia('media-123')).rejects.toThrow('CloudApiClient not configured');
  });

  it('downloads media via two-step Graph API lookup and stream', async () => {
    const client = new CloudApiClient({
      accessToken: 'test-token',
      phoneNumberId: '12345',
    });

    const fakeBytes = new Uint8Array([1, 2, 3, 4, 5]);

    global.fetch = vi.fn(async (url, options) => {
      if (url.includes('graph.facebook.com') && url.includes('media-999')) {
        return {
          ok: true,
          json: async () => ({
            url: 'https://lookaside.fbsbx.com/whatsapp_business/media/download/media-999',
            mime_type: 'audio/ogg; codecs=opus',
          }),
        };
      }
      if (url.includes('lookaside.fbsbx.com')) {
        return {
          ok: true,
          arrayBuffer: async () => fakeBytes.buffer,
        };
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    const res = await client.downloadMedia('media-999');
    expect(res.mimeType).toBe('audio/ogg; codecs=opus');
    expect(Buffer.isBuffer(res.buffer)).toBe(true);
    expect(res.buffer).toEqual(Buffer.from([1, 2, 3, 4, 5]));
  });
});
