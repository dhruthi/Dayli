import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isSarvamConfigured,
  isSarvamLanguage,
  transcribeSarvam,
  synthesizeSarvam,
  SARVAM_LANGUAGES,
} from '../lib/sarvam.js';

function mockFetch(response, status = 200) {
  const calls = [];
  global.fetch = vi.fn().mockImplementation(async (url, opts) => {
    let body = opts?.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    } else if (body && typeof body.entries === 'function') {
      const parsed = {};
      for (const [k, v] of body.entries()) {
        parsed[k] = v;
      }
      body = parsed;
    }
    calls.push({ url, opts, body });
    return {
      ok: status === 200,
      status,
      text: async () => 'error',
      json: async () => response,
    };
  });
  return calls;
}

describe('Sarvam AI Voice Integration (lib/sarvam.js)', () => {
  const originalFetch = global.fetch;
  const envBackup = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.SARVAM_API_KEY = 'test-sarvam-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...envBackup };
  });

  describe('isSarvamConfigured', () => {
    it('returns true when API key is set', () => {
      expect(isSarvamConfigured()).toBe(true);
    });

    it('returns false when API key is missing', () => {
      delete process.env.SARVAM_API_KEY;
      expect(isSarvamConfigured()).toBe(false);
    });
  });

  describe('isSarvamLanguage', () => {
    it('accepts supported Indian languages', () => {
      for (const lang of ['hi', 'te', 'ta', 'kn', 'ml', 'mr', 'bn', 'gu', 'pa', 'od', 'en']) {
        expect(isSarvamLanguage(lang)).toBe(true);
      }
    });

    it('accepts Odia alias "or"', () => {
      expect(isSarvamLanguage('or')).toBe(true);
    });

    it('rejects unsupported languages', () => {
      expect(isSarvamLanguage('ar')).toBe(false);
      expect(isSarvamLanguage('fr')).toBe(false);
      expect(isSarvamLanguage('sw')).toBe(false);
    });

    it('handles null/undefined gracefully', () => {
      expect(isSarvamLanguage(null)).toBe(false);
      expect(isSarvamLanguage(undefined)).toBe(false);
    });
  });

  describe('SARVAM_LANGUAGES set', () => {
    it('contains exactly 11 languages', () => {
      expect(SARVAM_LANGUAGES.size).toBe(11);
    });
  });

  describe('transcribeSarvam (ASR)', () => {
    it('returns null if API key is missing', async () => {
      delete process.env.SARVAM_API_KEY;
      expect(await transcribeSarvam(Buffer.from('audio'), 'te')).toBeNull();
    });

    it('returns null if audio buffer is empty', async () => {
      expect(await transcribeSarvam(Buffer.from([]), 'te')).toBeNull();
    });

    it('returns null for unsupported language', async () => {
      global.fetch = vi.fn();
      expect(await transcribeSarvam(Buffer.from('audio'), 'ar')).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('sends audio file to Sarvam ASR and returns transcript', async () => {
      const audio = Buffer.from('fake-ogg-audio');
      const calls = mockFetch({ transcript: 'నా బిడ్డకు జ్వరం వచ్చింది' });

      const result = await transcribeSarvam(audio, 'te');

      expect(result).toBe('నా బిడ్డకు జ్వరం వచ్చింది');
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toContain('speech-to-text');
      expect(calls[0].opts.headers['API-Subscription-Key']).toBe('test-sarvam-key');
      expect(calls[0].body.language_code).toBe('te-IN');
      expect(calls[0].body.model).toBe('saaras:v3');
    });

    it('maps Odia "or" to "od-IN"', async () => {
      const calls = mockFetch({ transcript: 'ଟେଷ୍ଟ' });
      await transcribeSarvam(Buffer.from('audio'), 'or');
      expect(calls[0].body.language_code).toBe('od-IN');
    });

    it('returns null on HTTP error', async () => {
      mockFetch({}, 500);
      expect(await transcribeSarvam(Buffer.from('audio'), 'hi')).toBeNull();
    });

    it('returns null on empty transcript', async () => {
      mockFetch({ transcript: '' });
      expect(await transcribeSarvam(Buffer.from('audio'), 'hi')).toBeNull();
    });

    it('returns null on timeout', async () => {
      process.env.SARVAM_TIMEOUT_MS = '50';
      global.fetch = vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 200)));
      expect(await transcribeSarvam(Buffer.from('audio'), 'te')).toBeNull();
    });
  });

  describe('synthesizeSarvam (TTS)', () => {
    it('returns null if API key is missing', async () => {
      delete process.env.SARVAM_API_KEY;
      expect(await synthesizeSarvam('హలో', 'te')).toBeNull();
    });

    it('returns null for unsupported language', async () => {
      global.fetch = vi.fn();
      expect(await synthesizeSarvam('مرحبا', 'ar')).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns null for empty text', async () => {
      expect(await synthesizeSarvam('', 'te')).toBeNull();
    });

    it('sends text to Sarvam TTS and returns WAV buffer', async () => {
      const wavBytes = Buffer.from('synthesized-wav-bytes');
      const calls = mockFetch({ audios: [wavBytes.toString('base64')] });

      const result = await synthesizeSarvam('శిశువుకు జ్వరం వచ్చింది', 'te');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('synthesized-wav-bytes');
      expect(calls[0].url).toContain('text-to-speech');
      expect(calls[0].opts.headers['API-Subscription-Key']).toBe('test-sarvam-key');
      expect(calls[0].body.target_language_code).toBe('te-IN');
      expect(calls[0].body.speaker).toBe('kavya');
      expect(calls[0].body.model).toBe('bulbul:v3');
      expect(calls[0].body.inputs).toEqual(['శిశువుకు జ్వరం వచ్చింది']);
    });

    it('uses custom speaker from env', async () => {
      process.env.SARVAM_TTS_SPEAKER = 'arvind';
      const calls = mockFetch({ audios: ['AAAA'] });
      await synthesizeSarvam('test text here', 'en');
      expect(calls[0].body.speaker).toBe('arvind');
    });

    it('returns null on HTTP error', async () => {
      mockFetch({}, 500);
      expect(await synthesizeSarvam('नमस्ते दोस्तों', 'hi')).toBeNull();
    });

    it('returns null when no audio in response', async () => {
      mockFetch({ audios: [] });
      expect(await synthesizeSarvam('నమస్కారం', 'te')).toBeNull();
    });
  });
});
