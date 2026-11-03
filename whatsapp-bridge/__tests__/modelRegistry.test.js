import { describe, it, expect } from 'vitest';
import {
  findModel,
  getAllModels,
  resolveActiveModel,
  formatModelMenu,
  parseModelCommand,
  handleModelCommand,
  CLINICAL_MODELS,
} from '../lib/modelRegistry.js';
import { buildMedGemmaSystemPrompt } from '../lib/medgemmaPrompt.js';

describe('Clinical Model Registry & Multi-Model Switcher (lib/modelRegistry.js)', () => {
  describe('Model Lookup & Resolution', () => {
    it('registers MedGemma, BioMistral, and Baichuan-M models', () => {
      const models = getAllModels();
      const ids = models.map((m) => m.id);
      expect(ids).toContain('medgemma');
      expect(ids).toContain('biomistral');
      expect(ids).toContain('baichuan');
      expect(ids).toContain('dayli-health');
    });

    it('resolves MedGemma by id and common aliases', () => {
      expect(findModel('medgemma')?.id).toBe('medgemma');
      expect(findModel('med-gemma')?.id).toBe('medgemma');
      expect(findModel('gemma')?.id).toBe('medgemma');
      expect(findModel('medgemma:latest')?.id).toBe('medgemma');
      expect(findModel('#model medgemma')?.id).toBe('medgemma');
    });

    it('resolves BioMistral by id and aliases', () => {
      expect(findModel('biomistral')?.id).toBe('biomistral');
      expect(findModel('biomistral:7b')?.id).toBe('biomistral');
      expect(findModel('bio-mistral')?.id).toBe('biomistral');
      expect(findModel('cniongolo/biomistral')?.id).toBe('biomistral');
    });

    it('resolves Baichuan-M by id and aliases', () => {
      expect(findModel('baichuan')?.id).toBe('baichuan');
      expect(findModel('baichuan-m')?.id).toBe('baichuan');
      expect(findModel('baichuan2')?.id).toBe('baichuan');
      expect(findModel('baichuan2:7b')?.id).toBe('baichuan');
      expect(findModel('baichuan-m:latest')?.id).toBe('baichuan');
    });

    it('returns null for unknown models or empty query', () => {
      expect(findModel('gpt-unknown')).toBeNull();
      expect(findModel('')).toBeNull();
      expect(findModel(null)).toBeNull();
    });

    it('resolves active model prioritizing session over environment over default', () => {
      // 1. Default fallback
      expect(resolveActiveModel().id).toBe('medgemma');

      // 2. Env fallback
      expect(resolveActiveModel({ envModel: 'biomistral' }).id).toBe('biomistral');

      // 3. Session preference overrides env
      const session = { profile: { activeModelId: 'baichuan', activeModel: 'baichuan-m:latest' } };
      expect(resolveActiveModel({ session, envModel: 'medgemma' }).id).toBe('baichuan');
    });
  });

  describe('WhatsApp Chat Command Parsing', () => {
    it('detects model status queries', () => {
      expect(parseModelCommand('#model')).toEqual({ isCommand: true, action: 'status' });
      expect(parseModelCommand('/model')).toEqual({ isCommand: true, action: 'status' });
      expect(parseModelCommand('!model')).toEqual({ isCommand: true, action: 'status' });
      expect(parseModelCommand('models')).toEqual({ isCommand: true, action: 'status' });
      expect(parseModelCommand('which model')).toEqual({ isCommand: true, action: 'status' });
    });

    it('detects model switch commands', () => {
      expect(parseModelCommand('#model biomistral')).toEqual({
        isCommand: true,
        action: 'switch',
        modelQuery: 'biomistral',
      });
      expect(parseModelCommand('/model baichuan')).toEqual({
        isCommand: true,
        action: 'switch',
        modelQuery: 'baichuan',
      });
      expect(parseModelCommand('switch to biomistral')).toEqual({
        isCommand: true,
        action: 'switch',
        modelQuery: 'biomistral',
      });
      expect(parseModelCommand('use baichuan-m')).toEqual({
        isCommand: true,
        action: 'switch',
        modelQuery: 'baichuan-m',
      });
    });

    it('ignores non-command clinical and weather messages', () => {
      expect(parseModelCommand('i have a headache').isCommand).toBe(false);
      expect(parseModelCommand('weather in hyderabad').isCommand).toBe(false);
      expect(parseModelCommand('hi').isCommand).toBe(false);
    });
  });

  describe('Execution & State Management', () => {
    it('returns formatted menu when checking status', () => {
      const res = handleModelCommand('#model', {});
      expect(res.handled).toBe(true);
      expect(res.reply).toContain('Dayli AI — Medical LLM Selector');
      expect(res.reply).toContain('Google MedGemma');
      expect(res.reply).toContain('BioMistral');
      expect(res.reply).toContain('Baichuan-M');
    });

    it('switches model and updates session profile', () => {
      const session = { profile: { name: 'Yashwanth' } };
      const res = handleModelCommand('#model biomistral', session);
      expect(res.handled).toBe(true);
      expect(res.switchedModel?.id).toBe('biomistral');
      expect(session.profile.activeModelId).toBe('biomistral');
      expect(session.profile.activeModel).toBe('biomistral:latest');
      expect(res.reply).toContain('Active Model Switched');
      expect(res.reply).toContain('BioMistral');
    });

    it('returns graceful guidance on unknown model switch', () => {
      const session = {};
      const res = handleModelCommand('#model random_gpt', session);
      expect(res.handled).toBe(true);
      expect(res.reply).toContain('Unknown Model');
      expect(res.reply).toContain('medgemma');
    });
  });

  describe('Model-Specific System Prompt Adaptations', () => {
    it('adapts persona header for BioMistral', () => {
      const prompt = buildMedGemmaSystemPrompt({ userName: 'Yashwanth', model: 'biomistral' });
      expect(prompt).toContain('BioMistral');
      expect(prompt).toContain('Yashwanth');
      expect(prompt).toContain('Never prescribe medication doses');
      expect(prompt).toContain('exclusive breastfeeding or formula only');
    });

    it('adapts persona header for Baichuan-M', () => {
      const prompt = buildMedGemmaSystemPrompt({ userName: 'Yashwanth', model: 'baichuan' });
      expect(prompt).toContain('Baichuan-M');
      expect(prompt).toContain('multilingual health copilot');
      expect(prompt).toContain('exclusive breastfeeding or formula only');
    });

    it('maintains MedGemma default persona', () => {
      const prompt = buildMedGemmaSystemPrompt({ userName: 'Yashwanth', model: 'medgemma' });
      expect(prompt).toContain('caring, warm, and knowledgeable');
      expect(prompt).toContain('exclusive breastfeeding or formula only');
    });
  });
});
