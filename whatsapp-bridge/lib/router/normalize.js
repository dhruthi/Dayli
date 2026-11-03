/**
 * Dayli AI — Multilingual Text Normalizer & Script/Dialect Detector
 * Handles 8 Indian Languages + English across native Indic scripts
 * and Romanized code-mixed dialects (Tenglish, Hinglish, Tanglish, Kanglish, etc.).
 */

import { detectLanguage } from '../i18n/detect.js';

/**
 * Normalizes input text and detects language/script representation.
 * @param {string} text
 * @returns {{ normalized: string, detectedLang: string, script: string }}
 */
export function normalize(text = '') {
  const raw = String(text || '').normalize('NFC').trim();
  const lower = raw.toLowerCase();

  const detected = detectLanguage(raw);

  return {
    normalized: lower,
    detectedLang: detected.rawLang,
    script: detected.script,
  };
}
