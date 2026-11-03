/**
 * ==============================================================================
 * Dayli AI — Purpose-Built Multilingual Human-Scale Router
 * ==============================================================================
 * Central in-process classifier for clinical triage, maternal care, and climate
 * intelligence routing across English, Telugu, Hindi, Tenglish, and Hinglish.
 * Runs in <1 ms on CPU with zero commercial frontier model API calls.
 */

import { normalize } from './normalize.js';
import { featurize } from './featurize.js';
import { predict, getRouterMetadata } from './model.js';

/** Minimum confidence threshold to consider intent definitively routed without clarification menu */
export const CONFIDENCE_THRESHOLD = 0.25;

/**
 * Routes user message into structured intent and clinical urgency.
 *
 * @param {string} rawText Inbound message text
 * @returns {{
 *   intent: string,
 *   intentConfidence: number,
 *   urgency: 'routine'|'same_day'|'emergency_signal',
 *   urgencyConfidence: number,
 *   lang: 'en'|'te'|'hi'|'te-Latn'|'hi-Latn',
 *   script: 'telugu'|'devanagari'|'latin',
 *   isLowConfidence: boolean,
 *   text: string,
 *   allIntents: Record<string, number>,
 *   allUrgencies: Record<string, number>
 * }}
 */
export function route(rawText = '') {
  const norm = normalize(rawText);
  const features = featurize(norm.normalized);
  const result = predict(features);

  return {
    intent: result.intent.label,
    intentConfidence: result.intent.confidence,
    confidence: result.intent.confidence,
    urgency: result.urgency.label,
    urgencyConfidence: result.urgency.confidence,
    lang: norm.detectedLang,
    language: norm.detectedLang,
    script: norm.script,
    isLowConfidence: result.intent.confidence < CONFIDENCE_THRESHOLD,
    text: rawText,
    allIntents: result.allIntents,
    allUrgencies: result.allUrgencies,
  };
}

export { getRouterMetadata };
