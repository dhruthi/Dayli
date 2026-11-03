/**
 * Live user-activity aggregates for the /ops dashboard.
 *
 * Reads the active-user set and summarises the sessions behind it. Everything
 * returned is a COUNT — no phone numbers, no session contents, no message
 * history. The dashboard is an operational tool, not a way to read what people
 * told a health service.
 *
 * Results are cached briefly because the dashboard polls: without it, every
 * refresh would fan out one Upstash read per active user.
 */

import { Store, SERVICE_WINDOW_MS } from './store.js';
import { logger } from './logger.js';

/** Dashboard polls every ~15s; a 60s cache keeps Upstash reads bounded. */
const CACHE_TTL_MS = 60000;

/**
 * Upper bound on sessions read per refresh. A pilot will never hit this; if it
 * ever does, the dashboard reports a sample rather than silently melting the
 * Upstash quota.
 */
const MAX_SESSIONS_SAMPLED = 500;

const DAY_MS = 24 * 60 * 60 * 1000;

let cache = null;

function bump(obj, key) {
  const k = key || 'unknown';
  obj[k] = (obj[k] || 0) + 1;
}

/**
 * Aggregate the currently-known sessions.
 *
 * @param {import('./store.js').Store} store
 * @returns {Promise<object>} aggregate counts only
 */
export async function userActivitySnapshot(store, { force = false } = {}) {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return { ...cache.value, cached: true };
  }

  const summary = {
    // The active-user set holds CONSENTED users only: saveSession() removes
    // anyone who has not granted consent. So this is a consented-user count,
    // not a reach count. Declines are counted as events in metrics.js because
    // sessions here can never show them.
    consentedUsers: 0,
    sampled: 0,
    truncated: false,
    windowOpen: 0,
    activeLast24h: 0,
    activeLast7d: 0,
    locale: {},
    subjectType: {},
    withLocation: 0,
    pendingFollowUps: 0,
    onboarded: 0,
    cached: false,
    error: null,
  };

  try {
    const ids = (await store.getActiveUsers()) || [];
    summary.consentedUsers = ids.length;

    const slice = ids.slice(0, MAX_SESSIONS_SAMPLED);
    summary.truncated = ids.length > slice.length;

    const now = Date.now();
    for (const id of slice) {
      let session;
      try {
        session = await store.getSession(id);
      } catch {
        continue; // one unreadable session must not break the whole view
      }
      if (!session) continue;
      summary.sampled += 1;

      const profile = session.profile || {};
      bump(summary.locale, profile.locale);
      bump(summary.subjectType, profile.subjectType);

      if (profile.location && profile.location.latitude != null) summary.withLocation += 1;
      if (profile.subjectType && profile.subjectType !== 'unknown') summary.onboarded += 1;
      if (session.pendingFollowUp) summary.pendingFollowUps += 1;

      if (Store.isWindowOpen(session)) summary.windowOpen += 1;

      const last = Number(session.lastInboundAt) || 0;
      if (last && now - last < DAY_MS) summary.activeLast24h += 1;
      if (last && now - last < 7 * DAY_MS) summary.activeLast7d += 1;
    }

    summary.serviceWindowHours = Math.round(SERVICE_WINDOW_MS / 3600000);
    cache = { at: Date.now(), value: summary };
    return summary;
  } catch (err) {
    logger.warn?.(`[ops] user activity snapshot failed: ${err?.message || err}`);
    summary.error = String(err?.message || err);
    return summary;
  }
}

/** Test seam. */
export function _clearOpsCache() {
  cache = null;
}
