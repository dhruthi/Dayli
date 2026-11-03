/**
 * Operational metrics for the /ops dashboard.
 *
 * Two layers, deliberately:
 *
 *   1. In-process counters — exact, free, and reset on every deploy. These
 *      answer "is it healthy right now".
 *   2. Per-day Redis rollups — survive restarts, which matters because Render
 *      redeploys wipe the process several times a week. These answer "is today
 *      worse than yesterday".
 *
 * Redis writes are BATCHED. Incrementing on every event would cost 3-5 Upstash
 * commands per message; instead events accumulate in memory and flush as a
 * single pipeline every 15s. A pilot doing a few hundred messages a day then
 * costs a few hundred commands, not a few thousand.
 *
 * Nothing here stores a phone number, a message body, or anything that could
 * re-identify a user. Counters are aggregate; user ids are never a key.
 */

import { getRedis, isRedisConfigured } from './redis.js';
import { logger } from './logger.js';

/** Rollups older than this are dropped — a month of history is plenty. */
const ROLLUP_TTL_SECONDS = 35 * 24 * 60 * 60;

/** How often the pending batch is written to Redis. */
const FLUSH_INTERVAL_MS = 15000;

/** Reply latencies kept in memory for percentile maths. */
const LATENCY_WINDOW = 500;

const KEY_PREFIX = 'dayli:metrics:';

const startedAt = Date.now();

/** Cumulative for this process lifetime. */
const counters = new Map();

/** Not yet written to Redis. Cleared on a successful flush. */
let pending = new Map();

/** Recent reply latencies in ms, newest last, capped at LATENCY_WINDOW. */
const latencies = [];

let flushTimer = null;

/** UTC day key. Deliberately UTC so a restart cannot straddle two local days. */
function dayKey(date = new Date()) {
  return KEY_PREFIX + date.toISOString().slice(0, 10);
}

/**
 * Record one occurrence of an event.
 *
 * Never throws and never awaits: this sits on the request path and a metrics
 * problem must not become a user-facing one.
 */
export function increment(name, by = 1) {
  if (!name || !Number.isFinite(by)) return;
  counters.set(name, (counters.get(name) || 0) + by);
  pending.set(name, (pending.get(name) || 0) + by);
}

/** Record a reply latency sample (inbound webhook -> outbound send, ms). */
export function observeLatency(ms) {
  if (!Number.isFinite(ms) || ms < 0) return;
  latencies.push(ms);
  if (latencies.length > LATENCY_WINDOW) latencies.shift();
  increment('reply.count');
}

function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Math.round(sorted[idx]);
}

/** Latency percentiles over the in-memory window. */
export function latencySummary() {
  if (latencies.length === 0) {
    return { samples: 0, p50: null, p95: null, p99: null, max: null };
  }
  const sorted = [...latencies].sort((a, b) => a - b);
  return {
    samples: sorted.length,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    max: Math.round(sorted[sorted.length - 1]),
  };
}

/** Everything this process has counted since boot. */
export function snapshot() {
  return {
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    startedAt: new Date(startedAt).toISOString(),
    counters: Object.fromEntries([...counters.entries()].sort()),
    latency: latencySummary(),
  };
}

/**
 * Write the pending batch as one pipeline.
 *
 * On failure the batch is put back so nothing is lost to a transient Upstash
 * blip — a later flush picks it up.
 */
export async function flushNow() {
  if (pending.size === 0) return { flushed: 0 };
  if (!isRedisConfigured()) {
    pending = new Map();
    return { flushed: 0, reason: 'no_redis' };
  }

  const batch = pending;
  pending = new Map();

  try {
    const redis = await getRedis();
    if (!redis) throw new Error('redis unavailable');

    const key = dayKey();
    const pipeline = redis.pipeline();
    for (const [name, value] of batch) {
      pipeline.hincrby(key, name, value);
    }
    pipeline.expire(key, ROLLUP_TTL_SECONDS);
    await pipeline.exec();
    return { flushed: batch.size };
  } catch (err) {
    // Merge the failed batch back in front of anything new.
    for (const [name, value] of batch) {
      pending.set(name, (pending.get(name) || 0) + value);
    }
    logger.warn?.(`[metrics] flush failed, will retry: ${err?.message || err}`);
    return { flushed: 0, error: String(err?.message || err) };
  }
}

/** Read the last `days` daily rollups, newest first. */
export async function readRollups(days = 7) {
  if (!isRedisConfigured()) return [];
  try {
    const redis = await getRedis();
    if (!redis) return [];

    const dates = [];
    for (let i = 0; i < days; i += 1) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      dates.push(d);
    }

    const pipeline = redis.pipeline();
    for (const d of dates) pipeline.hgetall(dayKey(d));
    const results = await pipeline.exec();

    return dates.map((d, i) => {
      const [err, hash] = results?.[i] ?? [null, {}];
      const counts = {};
      if (!err && hash) {
        for (const [k, v] of Object.entries(hash)) counts[k] = Number(v) || 0;
      }
      return { date: d.toISOString().slice(0, 10), counters: counts };
    });
  } catch (err) {
    logger.warn?.(`[metrics] rollup read failed: ${err?.message || err}`);
    return [];
  }
}

export function startMetricsFlusher() {
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = setInterval(() => {
    flushNow().catch(() => {});
  }, FLUSH_INTERVAL_MS);
  flushTimer.unref?.();
  return flushTimer;
}

export async function stopMetricsFlusher() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  // Don't lose the last partial batch on shutdown.
  await flushNow().catch(() => {});
}

/** Test seam. */
export function _resetMetrics() {
  counters.clear();
  pending = new Map();
  latencies.length = 0;
}
