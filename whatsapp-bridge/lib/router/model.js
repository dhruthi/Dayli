/**
 * Dayli AI — Multilingual Router Inference Engine
 * Pure Node.js in-process linear model inference with zero external dependencies.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODEL_PATH = path.resolve(__dirname, '../../models/dayli-router-v1.json');

let modelData = null;

function loadModel() {
  if (!modelData) {
    if (!fs.existsSync(MODEL_PATH)) {
      throw new Error(`[router] Model file not found at ${MODEL_PATH}. Run python3 ml/train.py to generate it.`);
    }
    const raw = fs.readFileSync(MODEL_PATH, 'utf8');
    modelData = JSON.parse(raw);
  }
  return modelData;
}

/**
 * Computes softmax probabilities over an array of real-valued logits.
 * @param {number[]} logits
 * @returns {number[]} Probabilities summing to 1.0
 */
export function softmax(logits) {
  const maxLogit = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - maxLogit));
  const sumExps = exps.reduce((a, b) => a + b, 0) || 1.0;
  return exps.map((e) => e / sumExps);
}

/**
 * Computes dot product between a sparse feature vector and a sparse weight row.
 * sparseRow is [[col_idx, weight_val], ...]
 * featureVector is { indices: number[], values: number[] }
 */
function sparseDot(sparseRow, featureVector) {
  const featMap = new Map();
  for (let i = 0; i < featureVector.indices.length; i++) {
    featMap.set(featureVector.indices[i], featureVector.values[i]);
  }

  let sum = 0;
  for (let i = 0; i < sparseRow.length; i++) {
    const colIdx = sparseRow[i][0];
    const weight = sparseRow[i][1];
    const featVal = featMap.get(colIdx);
    if (featVal !== undefined) {
      sum += weight * featVal;
    }
  }
  return sum;
}

/**
 * Predicts intent and urgency given a featurized sparse vector.
 * @param {{ indices: number[], values: number[] }} features
 * @returns {{
 *   intent: { label: string, confidence: number },
 *   urgency: { label: string, confidence: number },
 *   allIntents: Record<string, number>,
 *   allUrgencies: Record<string, number>
 * }}
 */
export function predict(features) {
  const model = loadModel();

  // 1. Intent Head
  const intentClasses = model.intents.classes;
  const intentLogits = [];
  for (let c = 0; c < intentClasses.length; c++) {
    const bias = model.intents.biases[c] || 0;
    const dot = sparseDot(model.intents.weights[c], features);
    intentLogits.push(dot + bias);
  }
  const intentProbs = softmax(intentLogits);
  let bestIntentIdx = 0;
  let bestIntentProb = -1;
  const allIntents = {};
  for (let i = 0; i < intentClasses.length; i++) {
    allIntents[intentClasses[i]] = intentProbs[i];
    if (intentProbs[i] > bestIntentProb) {
      bestIntentProb = intentProbs[i];
      bestIntentIdx = i;
    }
  }

  // 2. Urgency Head
  const urgencyClasses = model.urgencies.classes;
  const urgencyLogits = [];
  for (let c = 0; c < urgencyClasses.length; c++) {
    const bias = model.urgencies.biases[c] || 0;
    const dot = sparseDot(model.urgencies.weights[c], features);
    urgencyLogits.push(dot + bias);
  }
  const urgencyProbs = softmax(urgencyLogits);
  let bestUrgencyIdx = 0;
  let bestUrgencyProb = -1;
  const allUrgencies = {};
  for (let i = 0; i < urgencyClasses.length; i++) {
    allUrgencies[urgencyClasses[i]] = urgencyProbs[i];
    if (urgencyProbs[i] > bestUrgencyProb) {
      bestUrgencyProb = urgencyProbs[i];
      bestUrgencyIdx = i;
    }
  }

  return {
    intent: {
      label: intentClasses[bestIntentIdx],
      confidence: bestIntentProb,
    },
    urgency: {
      label: urgencyClasses[bestUrgencyIdx],
      confidence: bestUrgencyProb,
    },
    allIntents,
    allUrgencies,
  };
}

export function getRouterMetadata() {
  const model = loadModel();
  return {
    version: model.version,
    createdAt: model.created_at,
    featureSpaceSize: model.feature_space_size,
    intents: model.intents.classes,
    urgencies: model.urgencies.classes,
    metrics: model.evaluation,
  };
}
