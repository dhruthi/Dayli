import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  increment,
  observeLatency,
  snapshot,
  latencySummary,
  flushNow,
  _resetMetrics,
} from '../lib/metrics.js';
import { Store } from '../lib/store.js';
import { userActivitySnapshot, _clearOpsCache } from '../lib/opsStats.js';

beforeEach(() => {
  _resetMetrics();
  _clearOpsCache();
});
afterEach(() => vi.unstubAllEnvs());

describe('metrics counters', () => {
  it('accumulates counts by name', () => {
    increment('inbound.message');
    increment('inbound.message');
    increment('outbound.sent', 3);
    const counters = snapshot().counters;
    expect(counters['inbound.message']).toBe(2);
    expect(counters['outbound.sent']).toBe(3);
  });

  it('ignores junk rather than corrupting the series', () => {
    increment('', 5);
    increment('valid', Number.NaN);
    increment(null, 1);
    expect(snapshot().counters).toEqual({});
  });

  it('reports uptime as a number of seconds', () => {
    expect(typeof snapshot().uptimeSeconds).toBe('number');
    expect(snapshot().uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});

describe('latency percentiles', () => {
  it('returns nulls rather than NaN before any sample', () => {
    expect(latencySummary()).toEqual({ samples: 0, p50: null, p95: null, p99: null, max: null });
  });

  it('computes percentiles over the window', () => {
    for (let i = 1; i <= 100; i += 1) observeLatency(i * 100);
    const s = latencySummary();
    expect(s.samples).toBe(100);
    expect(s.p50).toBeGreaterThanOrEqual(5000);
    expect(s.p50).toBeLessThanOrEqual(5200);
    expect(s.p95).toBeGreaterThan(s.p50);
    expect(s.max).toBe(10000);
  });

  it('counts a reply for each latency sample', () => {
    observeLatency(120);
    observeLatency(340);
    expect(snapshot().counters['reply.count']).toBe(2);
  });

  it('rejects negative and non-finite samples', () => {
    observeLatency(-5);
    observeLatency(Number.POSITIVE_INFINITY);
    expect(latencySummary().samples).toBe(0);
  });

  it('keeps the window bounded so memory cannot grow without limit', () => {
    for (let i = 0; i < 900; i += 1) observeLatency(i);
    expect(latencySummary().samples).toBeLessThanOrEqual(500);
  });
});

describe('flush without Redis', () => {
  it('drops the batch instead of throwing when no store is configured', async () => {
    vi.stubEnv('SESSION_STORE_URL', '');
    vi.stubEnv('REDIS_URL', '');
    increment('inbound.message');
    const res = await flushNow();
    expect(res.reason).toBe('no_redis');
    // In-process counters survive a dropped flush — the dashboard still works.
    expect(snapshot().counters['inbound.message']).toBe(1);
  });

  it('is a no-op when nothing is pending', async () => {
    expect(await flushNow()).toEqual({ flushed: 0 });
  });
});

describe('user activity snapshot', () => {
  let store;
  beforeEach(async () => {
    store = await Store.create();
    _clearOpsCache();
  });

  it('aggregates sessions into counts, never identities', async () => {
    await store.updateSession('919000000001', (s) => {
      s.profile.subjectType = 'infant';
      s.profile.locale = 'te';
      s.consent = { granted: true, grantedAt: Date.now(), version: 1 };
      s.lastInboundAt = Date.now();
      return s;
    });
    await store.updateSession('919000000002', (s) => {
      s.profile.subjectType = 'pregnant_person';
      s.profile.locale = 'hi';
      // Consent is required to appear at all: saveSession() drops anyone
      // without it from the active-user set.
      s.consent = { granted: true, grantedAt: Date.now(), version: 1 };
      s.lastInboundAt = Date.now();
      return s;
    });

    const snap = await userActivitySnapshot(store, { force: true });

    expect(snap.sampled).toBe(2);
    expect(snap.subjectType.infant).toBe(1);
    expect(snap.subjectType.pregnant_person).toBe(1);
    expect(snap.locale.te).toBe(1);
    expect(snap.locale.hi).toBe(1);
    expect(snap.consentedUsers).toBe(2);
    expect(snap.activeLast24h).toBe(2);

    // The whole point: no phone number may appear anywhere in the payload.
    const serialised = JSON.stringify(snap);
    expect(serialised).not.toContain('919000000001');
    expect(serialised).not.toContain('919000000002');
  });

  it('serves a cached copy so dashboard polling cannot hammer Redis', async () => {
    await store.updateSession('919000000003', (s) => {
      s.consent = { granted: true, grantedAt: Date.now(), version: 1 };
      s.lastInboundAt = Date.now();
      return s;
    });
    const first = await userActivitySnapshot(store, { force: true });
    expect(first.cached).toBe(false);
    const second = await userActivitySnapshot(store);
    expect(second.cached).toBe(true);
  });

  it('survives a store that throws instead of taking the dashboard down', async () => {
    const broken = {
      getActiveUsers: async () => {
        throw new Error('upstash unreachable');
      },
      getSession: async () => null,
    };
    const snap = await userActivitySnapshot(broken, { force: true });
    expect(snap.error).toContain('upstash unreachable');
    expect(snap.consentedUsers).toBe(0);
  });

  it('skips unreadable sessions rather than aborting the whole aggregate', async () => {
    const flaky = {
      getActiveUsers: async () => ['a', 'b'],
      getSession: async (id) => {
        if (id === 'a') throw new Error('corrupt');
        return { profile: { locale: 'en', subjectType: 'adult' }, lastInboundAt: Date.now() };
      },
    };
    const snap = await userActivitySnapshot(flaky, { force: true });
    expect(snap.consentedUsers).toBe(2);
    expect(snap.sampled).toBe(1);
    expect(snap.locale.en).toBe(1);
  });
});
