import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isBhashiniConfigured,
  isBhashiniLanguage,
  cleanTextForTTS,
  trimForSpeech,
  transcribeBhashini,
  synthesizeBhashini,
  getPipelineConfig,
  _resetBhashiniCache,
} from '../lib/bhashini.js';

const CONFIG_URL = 'meity-auth.ulcacontrib.org';
const CALLBACK = 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline';

/** Mock fetch that answers the ULCA config step and then the inference step. */
function mockBhashini({ serviceId, inference, configStatus = 200, inferenceStatus = 200 }) {
  const calls = [];
  global.fetch = vi.fn().mockImplementation(async (url, opts) => {
    calls.push({ url, opts, body: JSON.parse(opts.body) });
    if (url.includes(CONFIG_URL)) {
      return {
        ok: configStatus === 200,
        status: configStatus,
        text: async () => 'config error',
        json: async () => ({
          pipelineResponseConfig: [{ config: [{ serviceId, language: { sourceLanguage: 'te' } }] }],
          pipelineInferenceAPIEndPoint: {
            callbackUrl: CALLBACK,
            inferenceApiKey: { name: 'Authorization', value: 'inference-key-xyz' },
          },
        }),
      };
    }
    return {
      ok: inferenceStatus === 200,
      status: inferenceStatus,
      text: async () => 'inference error',
      json: async () => inference,
    };
  });
  return calls;
}

describe('Bhashini Indic Voice Integration (lib/bhashini.js)', () => {
  const originalFetch = global.fetch;
  const envBackup = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    _resetBhashiniCache();
    process.env.BHASHINI_USER_ID = 'test-user-id';
    process.env.BHASHINI_API_KEY = 'test-api-key';
    delete process.env.BHASHINI_INFERENCE_API_KEY;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...envBackup };
  });

  describe('isBhashiniConfigured', () => {
    it('returns true when credentials are set', () => {
      expect(isBhashiniConfigured()).toBe(true);
    });

    it('returns false when credentials are missing', () => {
      delete process.env.BHASHINI_API_KEY;
      expect(isBhashiniConfigured()).toBe(false);
    });

    it('accepts a direct inference key on its own', () => {
      delete process.env.BHASHINI_API_KEY;
      delete process.env.BHASHINI_USER_ID;
      process.env.BHASHINI_INFERENCE_API_KEY = 'direct';
      expect(isBhashiniConfigured()).toBe(true);
    });
  });

  it('knows which languages it serves', () => {
    expect(isBhashiniLanguage('te')).toBe(true);
    expect(isBhashiniLanguage('hi')).toBe(true);
    expect(isBhashiniLanguage('en')).toBe(true);
    expect(isBhashiniLanguage('ar')).toBe(false);
  });

  describe('cleanTextForTTS', () => {
    it('strips markdown asterisks, bullet points, and emojis cleanly', () => {
      const raw = '🌡️ *Upcoming Weather*: • Stay indoors! ☀️ _Call 112._';
      const cleaned = cleanTextForTTS(raw);

      expect(cleaned).not.toContain('*');
      expect(cleaned).not.toContain('_');
      expect(cleaned).not.toContain('•');
      expect(cleaned).not.toContain('🌡️');
      expect(cleaned).not.toContain('☀️');
      expect(cleaned).toContain('Upcoming Weather: Stay indoors! Call 112.');
    });

    it('drops URLs and does not double punctuation across lines', () => {
      const cleaned = cleanTextForTTS('Stay cool.\nDrink water\nSee https://dayli.ai/x');
      expect(cleaned).not.toContain('http');
      expect(cleaned).not.toContain('..');
      expect(cleaned).toContain('Stay cool. Drink water. See');
    });

    it('returns empty string for empty input', () => {
      expect(cleanTextForTTS('')).toBe('');
      expect(cleanTextForTTS(null)).toBe('');
    });
  });

  describe('trimForSpeech', () => {
    it('cuts on a sentence boundary, never mid-sentence', () => {
      const text = 'Keep baby in shade. Feed breastmilk often. Avoid going out between noon and four in the afternoon today.';
      const out = trimForSpeech(text, 50);
      expect(out).toBe('Keep baby in shade. Feed breastmilk often.');
    });

    it('handles the Hindi danda', () => {
      const out = trimForSpeech('बच्चे को छाँव में रखें। बार-बार दूध पिलाएं। दोपहर में बाहर न जाएं और पानी पीते रहें।', 30);
      expect(out.endsWith('।')).toBe(true);
    });
  });

  describe('getPipelineConfig (auth step 1)', () => {
    it('exchanges the ULCA key for an inference key and caches it', async () => {
      const calls = mockBhashini({ serviceId: 'ai4bharat/svc-te', inference: {} });
      const cfg = await getPipelineConfig('asr', 'te');
      await getPipelineConfig('asr', 'te');

      expect(cfg.serviceId).toBe('ai4bharat/svc-te');
      expect(cfg.authHeaderValue).toBe('inference-key-xyz');
      expect(cfg.endpoint).toBe(CALLBACK);
      expect(calls).toHaveLength(1); // second call served from cache
      expect(calls[0].opts.headers.userID).toBe('test-user-id');
      expect(calls[0].opts.headers.ulcaApiKey).toBe('test-api-key');
      expect(calls[0].body.pipelineTasks[0].taskType).toBe('asr');
      expect(calls[0].body.pipelineRequestConfig.pipelineId).toBeTruthy();
    });

    it('returns null when the config step fails', async () => {
      mockBhashini({ serviceId: 'x', inference: {}, configStatus: 401 });
      expect(await getPipelineConfig('tts', 'hi')).toBeNull();
    });

    it('skips the exchange when a direct inference key is set', async () => {
      process.env.BHASHINI_INFERENCE_API_KEY = 'direct-key';
      global.fetch = vi.fn();
      const cfg = await getPipelineConfig('tts', 'te');
      expect(global.fetch).not.toHaveBeenCalled();
      expect(cfg.authHeaderValue).toBe('direct-key');
      expect(cfg.serviceId).toContain('dravidian');
    });
  });

  describe('transcribeBhashini (ASR)', () => {
    it('returns null if credentials are not configured', async () => {
      delete process.env.BHASHINI_API_KEY;
      const res = await transcribeBhashini(Buffer.from('audio'), 'te');
      expect(res).toBeNull();
    });

    it('returns null if audio buffer is empty', async () => {
      const res = await transcribeBhashini(Buffer.from([]), 'te');
      expect(res).toBeNull();
    });

    it('returns null for a language Bhashini does not serve', async () => {
      global.fetch = vi.fn();
      expect(await transcribeBhashini(Buffer.from('a'), 'ar')).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('authenticates with the inference key and extracts the Telugu transcript', async () => {
      const calls = mockBhashini({
        serviceId: 'ai4bharat/conformer-multilingual-dravidian-gpu--t4',
        inference: { pipelineResponse: [{ output: [{ source: 'నా బిడ్డకు జ్వరం వచ్చింది' }] }] },
      });

      const audio = Buffer.from('fake-audio-bytes');
      const transcript = await transcribeBhashini(audio, 'te', { audioFormat: 'wav', samplingRate: 16000 });

      expect(transcript).toBe('నా బిడ్డకు జ్వరం వచ్చింది');
      const inf = calls[1];
      expect(inf.url).toBe(CALLBACK);
      expect(inf.opts.headers.Authorization).toBe('inference-key-xyz');
      const task = inf.body.pipelineTasks[0];
      expect(task.taskType).toBe('asr');
      expect(task.config.language.sourceLanguage).toBe('te');
      expect(task.config.serviceId).toContain('dravidian');
      expect(task.config.audioFormat).toBe('wav');
      expect(inf.body.inputData.audio[0].audioContent).toBe(audio.toString('base64'));
    });

    it('handles HTTP error gracefully and drops cached auth on 401', async () => {
      const calls = mockBhashini({ serviceId: 's', inference: {}, inferenceStatus: 401 });
      expect(await transcribeBhashini(Buffer.from('audio'), 'hi')).toBeNull();
      await transcribeBhashini(Buffer.from('audio'), 'hi');
      // config fetched again because the 401 invalidated the cache
      expect(calls.filter((c) => c.url.includes(CONFIG_URL))).toHaveLength(2);
    });
  });

  describe('synthesizeBhashini (TTS)', () => {
    it('returns null if credentials are not configured', async () => {
      delete process.env.BHASHINI_API_KEY;
      const res = await synthesizeBhashini('హలో', 'te');
      expect(res).toBeNull();
    });

    it('returns null if text is empty or too short', async () => {
      const res = await synthesizeBhashini('', 'te');
      expect(res).toBeNull();
    });

    it('constructs TTS pipeline payload and returns decoded audio Buffer', async () => {
      const sampleAudioBase64 = Buffer.from('synthesized-wav-bytes').toString('base64');
      const calls = mockBhashini({
        serviceId: 'ai4bharat/indic-tts-coqui-dravidian-gpu--t4',
        inference: { pipelineResponse: [{ audio: [{ audioContent: sampleAudioBase64 }] }] },
      });

      const audioBuffer = await synthesizeBhashini('శిశువుకు పలచని కాటన్ బట్టలు వేయండి.', 'te', 'female', { audioFormat: 'wav' });

      expect(audioBuffer).toBeInstanceOf(Buffer);
      expect(audioBuffer.toString()).toBe('synthesized-wav-bytes');

      const task = calls[1].body.pipelineTasks[0];
      expect(task.taskType).toBe('tts');
      expect(task.config.language.sourceLanguage).toBe('te');
      expect(task.config.gender).toBe('female');
      expect(task.config.audioFormat).toBe('wav');
      expect(task.config.serviceId).toContain('dravidian');
    });

    it('handles missing audioContent gracefully', async () => {
      mockBhashini({ serviceId: 's', inference: { pipelineResponse: [{ audio: [] }] } });
      const res = await synthesizeBhashini('नमस्ते', 'hi');
      expect(res).toBeNull();
    });
  });
});
