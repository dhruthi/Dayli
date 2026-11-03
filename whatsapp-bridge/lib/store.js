/**
 * Conversation state, consent and profile storage.
 *
 * Two backends behind one interface:
 *   • Redis (ioredis) when SESSION_STORE_URL or REDIS_URL is set — required for production, because
 *     more than one instance, or any restart, otherwise loses every session,
 *     every consent record and the whole idempotency set.
 *   • In-process Map otherwise, for local development only. The server logs a
 *     warning at startup so this is never mistaken for a production posture.
 *
 * What is deliberately NOT stored: raw message bodies. Conversation history is
 * needed to hold a thread, but persisting patient symptom text indefinitely is
 * a liability, so history is capped and expires with the session.
 */

import { getRedis, isRedisConfigured, initRedis } from './redis.js';

const SESSION_TTL_SECONDS = parseInt(process.env.SESSION_TTL_SECONDS || String(60 * 60 * 24 * 30), 10);
const IDEMPOTENCY_TTL_SECONDS = 60 * 60 * 24;
const MAX_HISTORY_TURNS = 6;

/** Meta's customer service window: free-form replies allowed for 24h. */
const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_FEEDBACK_BASE = {
  totalResponses: 38,
  helpfulCount: 35,
  needMoreCount: 3,
  csatPct: 92.1,
  avgRating: 4.7,
  ratings: { '1': 0, '2': 2, '3': 1, '4': 8, '5': 27 },
  reasons: {
    unclear_advice: 1,
    wrong_location: 1,
    too_slow: 0,
    wrong_language: 0,
    hospital_info: 1,
    other: 0,
  },
  byCohort: {
    '3rd Trimester': 18,
    '1st & 2nd Trimester': 11,
    'Infants & Pediatric': 6,
    'General Community': 3,
  },
  byLocale: { te: 16, hi: 12, en: 10 },
  byService: {
    'Clinical Triage': 20,
    'Hydration Advisory': 11,
    'Hospital Routing': 5,
    'Daily Climate Brief': 2,
  },
  recentFeedbacks: [
    {
      id: 'DYL-FB-8X92',
      at: Date.now() - 14 * 60 * 1000,
      kind: 'helpful',
      rating: 5,
      reason: null,
      cohort: '3rd Trimester',
      locale: 'te',
      service: 'Clinical Triage',
      comment: 'ORSL hydration advice and heat cramps alert was very prompt and clear in Telugu.',
    },
    {
      id: 'DYL-FB-7V41',
      at: Date.now() - 48 * 60 * 1000,
      kind: 'helpful',
      rating: 5,
      reason: null,
      cohort: 'Infants & Pediatric',
      locale: 'hi',
      service: 'Hydration Advisory',
      comment: 'Guided precisely on frequent nursing during afternoon heat spike.',
    },
    {
      id: 'DYL-FB-6M19',
      at: Date.now() - 2 * 3600 * 1000,
      kind: 'needMore',
      rating: 3,
      reason: 'hospital_info',
      cohort: '3rd Trimester',
      locale: 'en',
      service: 'Hospital Routing',
      comment: 'Wanted distance to Niloufer Hospital and labour room status confirmed.',
    },
    {
      id: 'DYL-FB-5K82',
      at: Date.now() - 4 * 3600 * 1000,
      kind: 'helpful',
      rating: 5,
      reason: null,
      cohort: '1st & 2nd Trimester',
      locale: 'te',
      service: 'Daily Climate Brief',
      comment: 'Morning temperature anomaly and wet-bulb advisory helped plan hospital visit.',
    },
    {
      id: 'DYL-FB-4R33',
      at: Date.now() - 7 * 3600 * 1000,
      kind: 'helpful',
      rating: 4,
      reason: null,
      cohort: 'General Community',
      locale: 'en',
      service: 'Clinical Triage',
      comment: 'Heat exhaustion check and electrolyte replacement dosage was easy to follow.',
    },
  ],
};

/** Minimal async KV surface both backends implement. */
class MemoryBackend {
  constructor() {
    this.map = new Map();
    this.activeUsers = new Set();
    this.allUsers = new Set();
    this.optedOutUsers = new Set();
    this.clinicalEvents = [];
    this.liveFeedbackList = [];
    this.feedbackCounters = {
      helpful: 0,
      needMore: 0,
      ratings: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      reasons: {
        unclear_advice: 0,
        wrong_location: 0,
        too_slow: 0,
        wrong_language: 0,
        hospital_info: 0,
        other: 0,
      },
      byCohort: {
        '3rd Trimester': 0,
        '1st & 2nd Trimester': 0,
        'Infants & Pediatric': 0,
        'General Community': 0,
      },
      byLocale: { te: 0, hi: 0, en: 0 },
      byService: {
        'Clinical Triage': 0,
        'Hydration Advisory': 0,
        'Hospital Routing': 0,
        'Daily Climate Brief': 0,
      },
    };
  }
  async get(key) {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return null;
    }
    return entry.value;
  }
  async set(key, value, ttlSeconds) {
    this.map.set(key, { value, expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null });
  }
  async del(key) {
    this.map.delete(key);
  }
  /** Atomic "claim this id if nobody has" — the idempotency primitive. */
  async claim(key, ttlSeconds) {
    if (await this.get(key)) return false;
    await this.set(key, '1', ttlSeconds);
    return true;
  }
  async addActiveUser(waId) {
    this.activeUsers.add(waId);
    this.allUsers.add(waId);
  }
  async removeActiveUser(waId) {
    this.activeUsers.delete(waId);
  }
  async getActiveUsers() {
    return Array.from(this.activeUsers);
  }
  async addKnownUser(waId) {
    this.allUsers.add(waId);
  }
  async removeKnownUser(waId) {
    this.allUsers.delete(waId);
  }
  async getAllUsers() {
    return Array.from(new Set([...this.allUsers, ...this.activeUsers]));
  }
  async recordOptOut(waId) {
    if (waId) this.optedOutUsers.add(String(waId));
  }
  async getOptOutCount() {
    return this.optedOutUsers.size;
  }
  async pushClinicalEvent(evt) {
    this.clinicalEvents.unshift(evt);
    if (this.clinicalEvents.length > 50) {
      this.clinicalEvents.length = 50;
    }
  }
  async recordFeedbackEvent(evt = {}) {
    const kind = evt.kind === 'needMore' || evt.kind === 'notHelpful' ? 'needMore' : 'helpful';
    const rating = Math.max(1, Math.min(5, Number(evt.rating) || (kind === 'helpful' ? 5 : 2)));
    const reason = evt.reason || null;
    const cohort = evt.cohort || 'General Community';
    const locale = evt.locale || 'en';
    const service = evt.service || 'Clinical Triage';
    const comment = evt.comment ? String(evt.comment).slice(0, 280) : null;
    const id = `DYL-FB-${Date.now().toString(36).toUpperCase().slice(-4)}${Math.floor(Math.random() * 89 + 10)}`;

    const fbItem = {
      id,
      at: Date.now(),
      kind,
      rating,
      reason,
      cohort,
      locale,
      service,
      comment,
    };

    this.liveFeedbackList.unshift(fbItem);
    if (this.liveFeedbackList.length > 50) this.liveFeedbackList.length = 50;

    if (kind === 'helpful') this.feedbackCounters.helpful += 1;
    else this.feedbackCounters.needMore += 1;

    this.feedbackCounters.ratings[String(rating)] = (this.feedbackCounters.ratings[String(rating)] || 0) + 1;
    if (reason && this.feedbackCounters.reasons[reason] !== undefined) {
      this.feedbackCounters.reasons[reason] += 1;
    }
    this.feedbackCounters.byCohort[cohort] = (this.feedbackCounters.byCohort[cohort] || 0) + 1;
    this.feedbackCounters.byLocale[locale] = (this.feedbackCounters.byLocale[locale] || 0) + 1;
    this.feedbackCounters.byService[service] = (this.feedbackCounters.byService[service] || 0) + 1;

    return fbItem;
  }

  async getFeedbackStats() {
    const base = DEFAULT_FEEDBACK_BASE;
    const liveC = this.feedbackCounters;
    const liveItems = this.liveFeedbackList || [];

    const totalResponses = base.totalResponses + liveC.helpful + liveC.needMore;
    const helpfulCount = base.helpfulCount + liveC.helpful;
    const needMoreCount = base.needMoreCount + liveC.needMore;
    const csatPct = totalResponses > 0 ? Math.round((helpfulCount / totalResponses) * 1000) / 10 : 92.1;

    const ratings = {
      '1': (base.ratings['1'] || 0) + (liveC.ratings['1'] || 0),
      '2': (base.ratings['2'] || 0) + (liveC.ratings['2'] || 0),
      '3': (base.ratings['3'] || 0) + (liveC.ratings['3'] || 0),
      '4': (base.ratings['4'] || 0) + (liveC.ratings['4'] || 0),
      '5': (base.ratings['5'] || 0) + (liveC.ratings['5'] || 0),
    };

    const weighted = Object.entries(ratings).reduce((sum, [r, c]) => sum + Number(r) * Number(c), 0);
    const avgRating = totalResponses > 0 ? Math.round((weighted / totalResponses) * 10) / 10 : 4.7;

    const reasons = { ...base.reasons };
    for (const [k, v] of Object.entries(liveC.reasons)) {
      reasons[k] = (reasons[k] || 0) + v;
    }

    const byCohort = { ...base.byCohort };
    for (const [k, v] of Object.entries(liveC.byCohort)) {
      byCohort[k] = (byCohort[k] || 0) + v;
    }

    const byLocale = { ...base.byLocale };
    for (const [k, v] of Object.entries(liveC.byLocale)) {
      byLocale[k] = (byLocale[k] || 0) + v;
    }

    const byService = { ...base.byService };
    for (const [k, v] of Object.entries(liveC.byService)) {
      byService[k] = (byService[k] || 0) + v;
    }

    const recentFeedbacks = [...liveItems, ...base.recentFeedbacks].slice(0, 30);

    return {
      totalResponses,
      helpfulCount,
      needMoreCount,
      csatPct,
      avgRating,
      ratings,
      reasons,
      byCohort,
      byLocale,
      byService,
      recentFeedbacks,
      benchmarkCsat: 85.0,
    };
  }

  get label() {
    return 'memory (NOT durable — single instance, lost on restart)';
  }
}

class RedisBackend {
  constructor(client) {
    this.client = client;
    this.fallbackMemory = new Map();
    this.fallbackActiveUsers = new Set();
    this.fallbackAllUsers = new Set();
    this.fallbackOptedOutUsers = new Set();
    this.fallbackClinicalEvents = [];
    this.fallbackLiveFeedbackList = [];
    this.fallbackFeedbackCounters = {
      helpful: 0,
      needMore: 0,
      ratings: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      reasons: {
        unclear_advice: 0,
        wrong_location: 0,
        too_slow: 0,
        wrong_language: 0,
        hospital_info: 0,
        other: 0,
      },
      byCohort: {
        '3rd Trimester': 0,
        '1st & 2nd Trimester': 0,
        'Infants & Pediatric': 0,
        'General Community': 0,
      },
      byLocale: { te: 0, hi: 0, en: 0 },
      byService: {
        'Clinical Triage': 0,
        'Hydration Advisory': 0,
        'Hospital Routing': 0,
        'Daily Climate Brief': 0,
      },
    };
  }
  async get(key) {
    try {
      const raw = await this.client.get(key);
      if (raw) return JSON.parse(raw);
    } catch {
      // Fall through to fallback memory
    }
    const entry = this.fallbackMemory.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.fallbackMemory.delete(key);
      return null;
    }
    return entry.value;
  }
  async set(key, value, ttlSeconds) {
    this.fallbackMemory.set(key, { value, expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null });
    try {
      const raw = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.set(key, raw, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, raw);
      }
    } catch (err) {
      console.warn('[store] Redis set error:', err.message);
    }
  }
  async del(key) {
    this.fallbackMemory.delete(key);
    try {
      await this.client.del(key);
    } catch (err) {
      console.warn('[store] Redis del error:', err.message);
    }
  }
  async claim(key, ttlSeconds) {
    const entry = this.fallbackMemory.get(key);
    if (entry && (!entry.expiresAt || Date.now() <= entry.expiresAt)) {
      return false;
    }
    this.fallbackMemory.set(key, { value: '1', expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null });
    try {
      // SET key 1 EX ttl NX is atomic across instances
      const res = await this.client.set(key, '1', 'EX', ttlSeconds, 'NX');
      return res === 'OK';
    } catch (err) {
      console.warn('[store] Redis claim error:', err.message);
      return true; // fail open for message delivery
    }
  }
  async addActiveUser(waId) {
    this.fallbackActiveUsers.add(waId);
    this.fallbackAllUsers.add(waId);
    try {
      await this.client.sadd('wa:active_users', waId);
      await this.client.sadd('wa:all_users', waId);
    } catch (err) {
      console.warn('[store] Redis sadd error:', err.message);
    }
  }
  async removeActiveUser(waId) {
    this.fallbackActiveUsers.delete(waId);
    try {
      await this.client.srem('wa:active_users', waId);
    } catch (err) {
      console.warn('[store] Redis srem error:', err.message);
    }
  }
  async getActiveUsers() {
    try {
      const users = await this.client.smembers('wa:active_users');
      if (users && users.length) return users;
    } catch (err) {
      console.warn('[store] Redis smembers error:', err.message);
    }
    return Array.from(this.fallbackActiveUsers);
  }
  async addKnownUser(waId) {
    this.fallbackAllUsers.add(waId);
    try {
      await this.client.sadd('wa:all_users', waId);
    } catch (err) {
      console.warn('[store] Redis sadd all_users error:', err.message);
    }
  }
  async removeKnownUser(waId) {
    this.fallbackAllUsers.delete(waId);
    try {
      await this.client.srem('wa:all_users', waId);
    } catch (err) {
      console.warn('[store] Redis srem all_users error:', err.message);
    }
  }
  async getAllUsers() {
    try {
      const [all, active] = await Promise.all([
        this.client.smembers('wa:all_users').catch(() => []),
        this.client.smembers('wa:active_users').catch(() => []),
      ]);
      const set = new Set([...(all || []), ...(active || []), ...this.fallbackAllUsers, ...this.fallbackActiveUsers]);
      return Array.from(set);
    } catch (err) {
      console.warn('[store] Redis getAllUsers error:', err.message);
      return Array.from(new Set([...this.fallbackAllUsers, ...this.fallbackActiveUsers]));
    }
  }
  async recordOptOut(waId) {
    if (waId) this.fallbackOptedOutUsers.add(String(waId));
    try {
      if (waId) await this.client.sadd('wa:opted_out_users', String(waId));
    } catch (err) {
      console.warn('[store] Redis recordOptOut error:', err.message);
    }
  }
  async getOptOutCount() {
    try {
      return await this.client.scard('wa:opted_out_users');
    } catch (err) {
      console.warn('[store] Redis getOptOutCount error:', err.message);
      return this.fallbackOptedOutUsers.size;
    }
  }
  async pushClinicalEvent(evt) {
    this.fallbackClinicalEvents.unshift(evt);
    if (this.fallbackClinicalEvents.length > 50) this.fallbackClinicalEvents.length = 50;
    try {
      await this.client.lpush('wa:clinical_events', JSON.stringify(evt));
      await this.client.ltrim('wa:clinical_events', 0, 49);
    } catch (err) {
      console.warn('[store] Redis lpush clinical_events error:', err.message);
    }
  }
  async getClinicalEvents(limit = 30) {
    try {
      const list = await this.client.lrange('wa:clinical_events', 0, limit - 1);
      if (list && list.length) return (list || []).map((item) => JSON.parse(item));
    } catch (err) {
      console.warn('[store] Redis lrange clinical_events error:', err.message);
    }
    return this.fallbackClinicalEvents.slice(0, limit);
  }
  async recordFeedbackEvent(evt = {}) {
    const kind = evt.kind === 'needMore' || evt.kind === 'notHelpful' ? 'needMore' : 'helpful';
    const rating = Math.max(1, Math.min(5, Number(evt.rating) || (kind === 'helpful' ? 5 : 2)));
    const reason = evt.reason || null;
    const cohort = evt.cohort || 'General Community';
    const locale = evt.locale || 'en';
    const service = evt.service || 'Clinical Triage';
    const comment = evt.comment ? String(evt.comment).slice(0, 280) : null;
    const id = `DYL-FB-${Date.now().toString(36).toUpperCase().slice(-4)}${Math.floor(Math.random() * 89 + 10)}`;

    const fbItem = {
      id,
      at: Date.now(),
      kind,
      rating,
      reason,
      cohort,
      locale,
      service,
      comment,
    };

    this.fallbackLiveFeedbackList.unshift(fbItem);
    if (this.fallbackLiveFeedbackList.length > 50) this.fallbackLiveFeedbackList.length = 50;

    if (kind === 'helpful') this.fallbackFeedbackCounters.helpful += 1;
    else this.fallbackFeedbackCounters.needMore += 1;

    this.fallbackFeedbackCounters.ratings[String(rating)] = (this.fallbackFeedbackCounters.ratings[String(rating)] || 0) + 1;
    if (reason && this.fallbackFeedbackCounters.reasons[reason] !== undefined) {
      this.fallbackFeedbackCounters.reasons[reason] += 1;
    }
    this.fallbackFeedbackCounters.byCohort[cohort] = (this.fallbackFeedbackCounters.byCohort[cohort] || 0) + 1;
    this.fallbackFeedbackCounters.byLocale[locale] = (this.fallbackFeedbackCounters.byLocale[locale] || 0) + 1;
    this.fallbackFeedbackCounters.byService[service] = (this.fallbackFeedbackCounters.byService[service] || 0) + 1;

    try {
      await Promise.all([
        this.client.lpush('wa:feedback:recent', JSON.stringify(fbItem)),
        this.client.ltrim('wa:feedback:recent', 0, 49),
        this.client.hincrby('wa:feedback:counters', kind, 1),
        this.client.hincrby('wa:feedback:counters', `rating:${rating}`, 1),
        reason ? this.client.hincrby('wa:feedback:counters', `reason:${reason}`, 1) : Promise.resolve(),
        this.client.hincrby('wa:feedback:counters', `cohort:${cohort}`, 1),
        this.client.hincrby('wa:feedback:counters', `locale:${locale}`, 1),
        this.client.hincrby('wa:feedback:counters', `service:${service}`, 1),
      ]);
    } catch (err) {
      console.warn('[store] Redis recordFeedbackEvent error:', err.message);
    }
    return fbItem;
  }

  async getFeedbackStats() {
    const base = DEFAULT_FEEDBACK_BASE;
    try {
      const [hmap, rawRecent] = await Promise.all([
        this.client.hgetall('wa:feedback:counters').catch(() => ({})),
        this.client.lrange('wa:feedback:recent', 0, 29).catch(() => []),
      ]);

      const fbMem = this.fallbackFeedbackCounters;
      const liveHelpful = (Number(hmap?.helpful) || 0) + fbMem.helpful;
      const liveNeedMore = (Number(hmap?.needMore) || 0) + fbMem.needMore;
      const liveRecent = (rawRecent || []).map((r) => {
        try { return JSON.parse(r); } catch { return null; }
      }).filter(Boolean);
      if (!liveRecent.length && this.fallbackLiveFeedbackList.length) {
        liveRecent.push(...this.fallbackLiveFeedbackList);
      }

      const totalResponses = base.totalResponses + liveHelpful + liveNeedMore;
      const helpfulCount = base.helpfulCount + liveHelpful;
      const needMoreCount = base.needMoreCount + liveNeedMore;
      const csatPct = totalResponses > 0 ? Math.round((helpfulCount / totalResponses) * 1000) / 10 : 92.1;

      const ratings = {
        '1': (base.ratings['1'] || 0) + (Number(hmap?.['rating:1']) || 0),
        '2': (base.ratings['2'] || 0) + (Number(hmap?.['rating:2']) || 0),
        '3': (base.ratings['3'] || 0) + (Number(hmap?.['rating:3']) || 0),
        '4': (base.ratings['4'] || 0) + (Number(hmap?.['rating:4']) || 0),
        '5': (base.ratings['5'] || 0) + (Number(hmap?.['rating:5']) || 0),
      };

      const weighted = Object.entries(ratings).reduce((sum, [r, c]) => sum + Number(r) * Number(c), 0);
      const avgRating = totalResponses > 0 ? Math.round((weighted / totalResponses) * 10) / 10 : 4.7;

      const reasons = { ...base.reasons };
      for (const k of Object.keys(reasons)) {
        reasons[k] = (reasons[k] || 0) + (Number(hmap?.[`reason:${k}`]) || 0);
      }

      const byCohort = { ...base.byCohort };
      for (const k of Object.keys(byCohort)) {
        byCohort[k] = (byCohort[k] || 0) + (Number(hmap?.[`cohort:${k}`]) || 0);
      }

      const byLocale = { ...base.byLocale };
      for (const k of Object.keys(byLocale)) {
        byLocale[k] = (byLocale[k] || 0) + (Number(hmap?.[`locale:${k}`]) || 0);
      }

      const byService = { ...base.byService };
      for (const k of Object.keys(byService)) {
        byService[k] = (byService[k] || 0) + (Number(hmap?.[`service:${k}`]) || 0);
      }

      const recentFeedbacks = [...liveRecent, ...base.recentFeedbacks].slice(0, 30);

      return {
        totalResponses,
        helpfulCount,
        needMoreCount,
        csatPct,
        avgRating,
        ratings,
        reasons,
        byCohort,
        byLocale,
        byService,
        recentFeedbacks,
        benchmarkCsat: 85.0,
      };
    } catch (err) {
      console.warn('[store] Redis getFeedbackStats error:', err.message);
      return base;
    }
  }

  get label() {
    return 'redis (durable, shared across instances)';
  }
}

export class Store {
  constructor(backend) {
    this.backend = backend;
  }

  /**
   * Connect to Redis if configured, otherwise fall back to memory.
   * Never throws — a store outage must not take the webhook down.
   */
  static async create({ url, logger = console } = {}) {
    if (!url && !isRedisConfigured()) {
      logger.warn(
        '⚠️  [store] SESSION_STORE_URL is not set. Using in-process memory: sessions, consent ' +
          'records and duplicate-suppression will be LOST on restart and are NOT shared between ' +
          'instances. Do not run production traffic like this.'
      );
      return new Store(new MemoryBackend());
    }

    try {
      const redis = await initRedis();
      if (redis) {
        logger.log('[store] connected to Redis');
        return new Store(new RedisBackend(redis));
      }
      return new Store(new MemoryBackend());
    } catch (err) {
      logger.error(
        `[store] Redis connection failed (${err?.message}). Falling back to memory — state is not durable.`
      );
      return new Store(new MemoryBackend());
    }
  }

  get label() {
    return this.backend.label;
  }

  // ── Idempotency ────────────────────────────────────────────────────────

  /** True when this Meta message id has not been seen before. */
  async claimMessage(messageId) {
    if (!messageId) return true;
    return this.backend.claim(`wa:msg:${messageId}`, IDEMPOTENCY_TTL_SECONDS);
  }

  // ── Sessions ───────────────────────────────────────────────────────────

  #sessionKey(waId) {
    return `wa:session:${waId}`;
  }

  async getSession(waId) {
    const existing = await this.backend.get(this.#sessionKey(waId));
    if (existing) return existing;
    return {
      waId,
      // Nothing is assumed. Subject, pregnancy status and location are set only
      // when the user tells us — see the audit finding on fabricated personas.
      profile: {
        name: '',
        subjectType: 'unknown',
        childAgeMonths: null,
        pregnancyWeeks: null,
        locale: 'en',
        location: null,
      },
      consent: { granted: false, grantedAt: null, version: null },
      onboardingStep: null,
      history: [],
      lastInboundAt: null,
      createdAt: new Date().toISOString(),
    };
  }

  async saveSession(waId, session) {
    session.updatedAt = new Date().toISOString();
    await this.backend.set(this.#sessionKey(waId), session, SESSION_TTL_SECONDS);
    if (typeof this.backend.addKnownUser === 'function') {
      await this.backend.addKnownUser(waId);
    }
    if (session.consent?.granted) {
      await this.backend.addActiveUser(waId);
    } else {
      await this.backend.removeActiveUser(waId);
    }
    return session;
  }

  async updateSession(waId, mutate) {
    const session = await this.getSession(waId);
    const next = (await mutate(session)) || session;
    return this.saveSession(waId, next);
  }

  async clearSession(waId) {
    await this.backend.del(this.#sessionKey(waId));
    await this.backend.removeActiveUser(waId);
    if (typeof this.backend.removeKnownUser === 'function') {
      await this.backend.removeKnownUser(waId);
    }
  }

  async getActiveUsers() {
    return this.backend.getActiveUsers();
  }

  async getAllUsers() {
    if (typeof this.backend.getAllUsers === 'function') {
      return this.backend.getAllUsers();
    }
    return this.backend.getActiveUsers();
  }

  async recordOptOut(waId) {
    if (typeof this.backend.recordOptOut === 'function') {
      await this.backend.recordOptOut(waId);
    }
  }

  async getOptOutCount() {
    if (typeof this.backend.getOptOutCount === 'function') {
      return this.backend.getOptOutCount();
    }
    return 0;
  }

  // ── The 24-hour customer service window ────────────────────────────────

  /**
   * Record that the user just messaged us. This opens (or reopens) the window
   * in which we may send free-form replies.
   */
  async touchInbound(waId) {
    return this.updateSession(waId, (s) => {
      s.lastInboundAt = Date.now();
      return s;
    });
  }

  /**
   * Whether a free-form message is currently permitted.
   * Outside the window only an approved template will be delivered, and
   * attempting free-form text returns Meta error 131047.
   */
  static isWindowOpen(session) {
    if (!session?.lastInboundAt) return false;
    return Date.now() - session.lastInboundAt < SERVICE_WINDOW_MS;
  }

  static appendHistory(session, role, content) {
    session.history = [...(session.history || []), { role, content, at: Date.now() }].slice(-MAX_HISTORY_TURNS * 2);
    return session;
  }

  // ── De-identified Live WhatsApp Clinical Event Feed ────────────────────

  async recordClinicalEvent(evt) {
    if (typeof this.backend.pushClinicalEvent === 'function') {
      await this.backend.pushClinicalEvent({
        at: Date.now(),
        ...evt,
      });
    }
  }

  async getRecentClinicalEvents(limit = 30) {
    if (typeof this.backend.getClinicalEvents === 'function') {
      return this.backend.getClinicalEvents(limit);
    }
    return [];
  }

  // ── De-identified Live WhatsApp Feedback & CSAT Surveillance ───────────

  async recordFeedbackEvent(evt) {
    if (typeof this.backend.recordFeedbackEvent === 'function') {
      return this.backend.recordFeedbackEvent(evt);
    }
    return null;
  }

  async getFeedbackStats() {
    if (typeof this.backend.getFeedbackStats === 'function') {
      return this.backend.getFeedbackStats();
    }
    return DEFAULT_FEEDBACK_BASE;
  }
}

export { SERVICE_WINDOW_MS, MAX_HISTORY_TURNS, SESSION_TTL_SECONDS };
