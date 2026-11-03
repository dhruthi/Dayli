/**
 * Dayli AI — Multilingual N-gram Featurizer with FNV-1a Hashing
 * Byte-for-byte identical to Python training pipeline.
 */

export const FEATURE_SPACE_SIZE = 16384;

/**
 * 32-bit FNV-1a hash function.
 * @param {string} str
 * @returns {number} Unsigned 32-bit integer
 */
export function fnv1a32(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Featurizes text into a sparse L2-normalized vector over FEATURE_SPACE_SIZE buckets.
 * @param {string} text Normalized lowercased string
 * @returns {{ indices: number[], values: number[] }}
 */
export function featurize(text) {
  const counts = new Map();

  const words = text.split(/\s+/).filter(Boolean);
  for (const w of words) {
    const h = fnv1a32(`w:${w}`) % FEATURE_SPACE_SIZE;
    counts.set(h, (counts.get(h) || 0) + 1);
  }

  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]}_${words[i + 1]}`;
    const h = fnv1a32(`wb:${bigram}`) % FEATURE_SPACE_SIZE;
    counts.set(h, (counts.get(h) || 0) + 1);
  }

  const padded = ` ${text} `;
  const nLen = padded.length;
  for (const n of [3, 4, 5]) {
    for (let i = 0; i <= nLen - n; i++) {
      const ngram = padded.slice(i, i + n);
      const h = fnv1a32(`c${n}:${ngram}`) % FEATURE_SPACE_SIZE;
      counts.set(h, (counts.get(h) || 0) + 1);
    }
  }

  // Compute L2 norm
  let sumSq = 0;
  for (const v of counts.values()) {
    sumSq += v * v;
  }
  const norm = Math.sqrt(sumSq) || 1.0;

  const indices = [];
  const values = [];
  for (const [idx, val] of counts.entries()) {
    indices.push(idx);
    values.push(val / norm);
  }

  return { indices, values };
}
