import { describe, it, expect } from 'vitest';
import { normalizeWebhook, isUnreadableMedia } from '../lib/inbound.js';
import { CloudApiClient } from '../lib/cloudApi.js';
import { Store, SERVICE_WINDOW_MS } from '../lib/store.js';
import * as onboarding from '../lib/onboarding.js';

const wrap = (value) => ({
  object: 'whatsapp_business_account',
  entry: [{ id: '1', changes: [{ field: 'messages', value }] }],
});

const textMsg = (body, overrides = {}) =>
  wrap({
    messaging_product: 'whatsapp',
    contacts: [{ wa_id: '919000000001', profile: { name: 'Priya' } }],
    messages: [{ from: '919000000001', id: 'wamid.1', type: 'text', timestamp: '1', text: { body }, ...overrides }],
  });

// ═══════════════════════════════════════════════════════════════════════════
// Inbound normalization — Part 19's WhatsApp matrix
// ═══════════════════════════════════════════════════════════════════════════

describe('inbound normalization', () => {
  it('normalizes a text message', () => {
    const [e] = normalizeWebhook(textMsg('my baby has a fever'));
    expect(e.kind).toBe('message');
    expect(e.type).toBe('text');
    expect(e.text).toBe('my baby has a fever');
    expect(e.from).toBe('919000000001');
    expect(e.profileName).toBe('Priya');
  });

  it('normalizes a button reply and keeps its id', () => {
    const [e] = normalizeWebhook(
      wrap({
        contacts: [{ wa_id: '91900', profile: { name: 'A' } }],
        messages: [
          {
            from: '91900',
            id: 'wamid.2',
            type: 'interactive',
            interactive: { type: 'button_reply', button_reply: { id: 'ob_consent_yes', title: 'Yes' } },
          },
        ],
      })
    );
    expect(e.replyId).toBe('ob_consent_yes');
    expect(e.text).toBe('Yes');
  });

  it('normalizes a list reply', () => {
    const [e] = normalizeWebhook(
      wrap({
        messages: [
          {
            from: '91900',
            id: 'wamid.3',
            type: 'interactive',
            interactive: { type: 'list_reply', list_reply: { id: 'ob_subj_infant', title: 'My baby' } },
          },
        ],
      })
    );
    expect(e.replyId).toBe('ob_subj_infant');
  });

  it('normalizes a template quick-reply (type "button", not "interactive")', () => {
    const [e] = normalizeWebhook(
      wrap({ messages: [{ from: '91900', id: 'w.4', type: 'button', button: { text: 'Yes', payload: 'PAYLOAD_A' } }] })
    );
    expect(e.replyId).toBe('PAYLOAD_A');
  });

  it('normalizes a location pin', () => {
    const [e] = normalizeWebhook(
      wrap({
        messages: [
          {
            from: '91900',
            id: 'w.5',
            type: 'location',
            location: { latitude: 17.38, longitude: 78.48, name: 'Hyderabad' },
          },
        ],
      })
    );
    expect(e.location.latitude).toBe(17.38);
    expect(e.location.name).toBe('Hyderabad');
  });

  it('normalizes a voice note and flags it as voice', () => {
    const [e] = normalizeWebhook(
      wrap({ messages: [{ from: '91900', id: 'w.6', type: 'audio', audio: { id: 'm1', mime_type: 'audio/ogg', voice: true } }] })
    );
    expect(e.type).toBe('audio');
    expect(e.media.isVoiceNote).toBe(true);
    expect(isUnreadableMedia(e)).toBe(true);
  });

  it('treats an image caption as readable text', () => {
    const [e] = normalizeWebhook(
      wrap({ messages: [{ from: '91900', id: 'w.7', type: 'image', image: { id: 'm2', caption: 'is this a heat rash?' } }] })
    );
    expect(e.text).toBe('is this a heat rash?');
    expect(isUnreadableMedia(e)).toBe(false);
  });

  it('normalizes delivery status callbacks', () => {
    const events = normalizeWebhook(
      wrap({
        statuses: [
          { id: 'wamid.9', recipient_id: '91900', status: 'failed', timestamp: '1', errors: [{ code: 131047, title: 'Re-engagement' }] },
        ],
      })
    );
    expect(events[0].kind).toBe('status');
    expect(events[0].status).toBe('failed');
    expect(events[0].errorInfo.code).toBe(131047);
  });

  it('surfaces account-level errors', () => {
    const [e] = normalizeWebhook(wrap({ errors: [{ code: 190, title: 'Access token expired' }] }));
    expect(e.kind).toBe('error');
    expect(e.errorInfo.code).toBe(190);
  });

  it('returns an empty list for malformed payloads rather than throwing', () => {
    for (const bad of [null, undefined, {}, { object: 'page' }, { object: 'whatsapp_business_account' }, { object: 'whatsapp_business_account', entry: 'x' }]) {
      expect(() => normalizeWebhook(bad)).not.toThrow();
      expect(normalizeWebhook(bad)).toEqual([]);
    }
  });

  it('does not throw on a message with a missing body', () => {
    expect(() => normalizeWebhook(wrap({ messages: [{ from: '9', id: 'w', type: 'text' }] }))).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Cloud API payload constraints — Meta rejects oversized fields outright
// ═══════════════════════════════════════════════════════════════════════════

describe('Cloud API payload limits', () => {
  it('splits a body over the 4096-character WhatsApp limit', () => {
    const long = 'a'.repeat(9000);
    const chunks = CloudApiClient.splitBody(long);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(4000);
  });

  it('breaks on a paragraph boundary when one falls inside the window', () => {
    // Total (2102) must exceed the limit (1500), and the boundary at 1200 sits
    // inside the acceptable window, so the split should land exactly on it.
    const body = `${'x'.repeat(1200)}\n\n${'y'.repeat(900)}`;
    const chunks = CloudApiClient.splitBody(body, 1500);
    expect(chunks.length).toBe(2);
    expect(chunks[0]).toBe('x'.repeat(1200));
    expect(chunks[1]).toBe('y'.repeat(900));
  });

  it('never severs a sentence across chunks when a space is available', () => {
    const words = Array.from({ length: 800 }, (_, i) => `word${i}`).join(' ');
    const chunks = CloudApiClient.splitBody(words, 1000);
    expect(chunks.length).toBeGreaterThan(1);
    // Rejoining must reproduce the original tokens, i.e. no token was cut.
    expect(chunks.join(' ').split(/\s+/)).toEqual(words.split(/\s+/));
  });

  it('leaves a short body as a single chunk', () => {
    expect(CloudApiClient.splitBody('short')).toEqual(['short']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// The 24-hour customer service window
// ═══════════════════════════════════════════════════════════════════════════

describe('24-hour customer service window', () => {
  it('is closed for a user who has never messaged', () => {
    expect(Store.isWindowOpen({ lastInboundAt: null })).toBe(false);
  });

  it('is open immediately after an inbound message', () => {
    expect(Store.isWindowOpen({ lastInboundAt: Date.now() })).toBe(true);
  });

  it('is closed once 24 hours have passed', () => {
    expect(Store.isWindowOpen({ lastInboundAt: Date.now() - SERVICE_WINDOW_MS - 1000 })).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Store behaviour
// ═══════════════════════════════════════════════════════════════════════════

describe('store', () => {
  it('claims a message id exactly once (idempotency)', async () => {
    const store = await Store.create({ logger: { warn() {}, log() {}, error() {} } });
    expect(await store.claimMessage('wamid.dup')).toBe(true);
    expect(await store.claimMessage('wamid.dup')).toBe(false);
  });

  it('creates a genuinely empty profile — no assumed persona', async () => {
    const store = await Store.create({ logger: { warn() {}, log() {}, error() {} } });
    const s = await store.getSession('919000000099');
    expect(s.profile.name).toBe('');
    expect(s.profile.subjectType).toBe('unknown');
    expect(s.profile.location).toBeNull();
    expect(s.consent.granted).toBe(false);
  });

  it('caps conversation history so PHI does not accumulate', () => {
    let s = { history: [] };
    for (let i = 0; i < 50; i++) s = Store.appendHistory(s, 'user', `m${i}`);
    expect(s.history.length).toBeLessThanOrEqual(12);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Onboarding and consent
// ═══════════════════════════════════════════════════════════════════════════

describe('onboarding', () => {
  const fresh = () => ({
    profile: { name: '', subjectType: 'unknown', childAgeMonths: null, pregnancyWeeks: null, location: null },
    consent: { granted: false },
    onboardingStep: onboarding.STEPS.CONSENT,
  });

  it('records consent with a version and timestamp', () => {
    const r = onboarding.advance(fresh(), { replyId: onboarding.ONBOARDING_IDS.consentYes });
    expect(r.session.consent.granted).toBe(true);
    expect(r.session.consent.version).toBe(onboarding.CONSENT_VERSION);
    expect(typeof r.session.consent.grantedAt).toBe('number');
  });

  it('lets a user decline without being blocked from asking questions', () => {
    const r = onboarding.advance(fresh(), { replyId: onboarding.ONBOARDING_IDS.consentNo });
    expect(r.session.consent.granted).toBe(false);
    expect(r.complete).toBe(true);
    expect(r.reply.body).toMatch(/nothing has been saved/i);
  });

  it('captures an infant subject then asks for age', () => {
    let s = fresh();
    s = onboarding.advance(s, { replyId: onboarding.ONBOARDING_IDS.consentYes }).session;
    const r = onboarding.advance(s, { replyId: 'ob_subj_infant' });
    expect(r.session.profile.subjectType).toBe('infant');
    expect(r.session.onboardingStep).toBe(onboarding.STEPS.CHILD_AGE);
    expect(r.reply.kind).toBe('list');
  });

  it('reclassifies an infant as a child when the stated age says so', () => {
    const s = { ...fresh(), onboardingStep: onboarding.STEPS.CHILD_AGE, profile: { ...fresh().profile, subjectType: 'infant' } };
    const r = onboarding.advance(s, { replyId: 'ob_age_36' });
    expect(r.session.profile.childAgeMonths).toBe(36);
    expect(r.session.profile.subjectType).toBe('child');
  });

  it('stores a shared location pin', () => {
    const s = { ...fresh(), onboardingStep: onboarding.STEPS.LOCATION };
    const r = onboarding.advance(s, { location: { latitude: 17.4, longitude: 78.5, name: 'Hyderabad' } });
    expect(r.session.profile.location.latitude).toBe(17.4);
    expect(r.complete).toBe(true);
  });

  it('recognises opt-out across languages and button reply IDs', () => {
    for (const w of ['stop', 'STOP', 'opt out', 'opt-out', 'OPT OUT', 'delete', 'delete my data', 'unsubscribe', 'बंद', 'ఆపు']) {
      expect(onboarding.isStopRequest(w), w).toBe(true);
    }
    expect(onboarding.isStopRequest('', onboarding.ONBOARDING_IDS.optOut)).toBe(true);
    expect(onboarding.isStopRequest('', onboarding.ONBOARDING_IDS.consentNo)).toBe(true);
    expect(onboarding.isStopRequest('my baby stopped feeding')).toBe(false);
    expect(onboarding.isStopRequest('my baby is crying non stop')).toBe(false);
    expect(onboarding.isStopRequest('baby is crying non-stop')).toBe(false);
    expect(onboarding.isStopRequest('the fever wont stop')).toBe(false);
    expect(onboarding.isStopRequest('how to stop baby crying')).toBe(false);
  });

  it('opts out on opt-out button and returns deletion confirmation', () => {
    const s = { ...fresh(), onboardingStep: onboarding.STEPS.CONSENT };
    const r = onboarding.advance(s, { replyId: onboarding.ONBOARDING_IDS.optOut });
    expect(r.optedOut).toBe(true);
    expect(r.complete).toBe(true);
    expect(r.reply.body).toMatch(/opted out|deleted|తొలగించబడ్డాయి|हटा दी गई/i);
  });

  it('never asks a question in the consent copy without stating the emergency route', () => {
    expect(onboarding.consentPrompt().footer).toMatch(/112/);
  });
});
