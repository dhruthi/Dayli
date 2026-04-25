/**
 * Meta WhatsApp Cloud API webhook.
 *
 *   GET  /api/whatsapp/webhook  — Meta verification handshake.
 *   POST /api/whatsapp/webhook  — incoming-message handler.
 *
 * The handler:
 *   1. Verifies the `X-Hub-Signature-256` HMAC against the raw request
 *      body using `META_WHATSAPP_APP_SECRET` (set up via the JSON
 *      `verify` callback in `app.ts`). Forged posts → 401.
 *   2. Resolves (or creates) the per-user conversation row keyed by an
 *      HMAC-SHA256 hash of the sender's E.164 number. The raw number is
 *      kept in memory only long enough to send the reply back via Meta.
 *   3. Per-user rate limit by phone hash to prevent a single user (or
 *      attacker who has stolen one phone number) from melting our AI
 *      bill.
 *   4. Onboarding state machine:
 *        new                → ack + ask for city/pincode (free-form, since
 *                             template approval is async on Meta's side
 *                             and we still want the integration to work
 *                             end-to-end inside the 24h window opened by
 *                             the user's inbound message)
 *        awaiting_location  → parse reply with the geocoder, store
 *                             location, transition to `ready`
 *        ready              → fetch real-time conditions for stored
 *                             location → run the dayli copilot → reply
 *   5. Persists the rolling history (last ~20 turns) so multi-turn
 *      replies stay context-aware.
 *
 * The whole route is feature-flagged on Meta secrets via
 * `loadWhatsappConfig()`. With no secrets set, every endpoint here
 * returns 503 and the rest of the API is unaffected.
 */
import { Router, type IRouter, type Request } from "express";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import {
  db,
  whatsappConversationsTable,
  whatsappProcessedMessagesTable,
  type WhatsappConversation,
  type WhatsappLocation,
  type WhatsappHistoryEntry,
} from "@workspace/db";
import {
  hashPhoneNumber,
  loadWhatsappConfig,
  sendWhatsappText,
  verifyMetaSignature,
  type WhatsappConfig,
} from "../lib/whatsapp";
import { fetchConditions } from "../lib/conditions";
import { geocodePlace } from "../lib/geocode";
import {
  emergencyReply,
  isEmergency,
  runCopilotOnce,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "../lib/copilot";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const HISTORY_CAP = 20;
const PER_USER_DAILY_LIMIT = 60;

// --- locale & message helpers ----------------------------------------------

function detectLocale(text: string, fallback: SupportedLocale): SupportedLocale {
  // Cheap script sniff. Reasonable for our four supported locales because
  // each one uses a distinct script (Latin / Devanagari / Telugu / Arabic).
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[\u0C00-\u0C7F]/.test(text)) return "te";
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  if (/[A-Za-z]/.test(text)) return "en";
  return fallback;
}

const ONBOARDING_GREETING: Record<SupportedLocale, string> = {
  en: "Welcome to dayli — your AI Climate Health Copilot for women and children. To personalise guidance for your weather and air quality, please reply with your city or pincode (for example: 'Hyderabad' or '500032').",
  hi: "dayli में आपका स्वागत है — महिलाओं और बच्चों के लिए आपका AI जलवायु-स्वास्थ्य सहायक। आपके मौसम और वायु गुणवत्ता के अनुसार सलाह देने के लिए, कृपया अपना शहर या पिनकोड भेजें (उदाहरण: 'हैदराबाद' या '500032')।",
  te: "dayliకి స్వాగతం — మహిళలు మరియు పిల్లల కోసం మీ AI వాతావరణ-ఆరోగ్య సహాయకుడు. మీ వాతావరణం మరియు గాలి నాణ్యత ఆధారంగా సలహాలు ఇవ్వడానికి, దయచేసి మీ నగరం లేదా పిన్‌కోడ్ పంపండి (ఉదాహరణ: 'హైదరాబాద్' లేదా '500032').",
  ar: "مرحباً بك في dayli — مساعدك الذكي للصحة المناخية للنساء والأطفال. لتخصيص الإرشادات وفقاً لطقسك وجودة الهواء، يرجى الرد باسم مدينتك أو الرمز البريدي (مثال: 'حيدر أباد' أو '500032').",
};

const ONBOARDING_NOT_FOUND: Record<SupportedLocale, string> = {
  en: "I couldn't find that location. Please send a city name or a 6-digit pincode.",
  hi: "मुझे वह स्थान नहीं मिला। कृपया शहर का नाम या 6 अंकों का पिनकोड भेजें।",
  te: "ఆ ప్రదేశం నాకు కనపడలేదు. దయచేసి నగరం పేరు లేదా 6 అంకెల పిన్‌కోడ్ పంపండి.",
  ar: "لم أتمكن من العثور على هذا الموقع. يرجى إرسال اسم المدينة أو الرمز البريدي المكون من 6 أرقام.",
};

const ONBOARDING_CONFIRMED: Record<SupportedLocale, (place: string) => string> = {
  en: (p) => `Got it — using ${p} for your local conditions. What would you like guidance on today?`,
  hi: (p) => `ठीक है — आपकी स्थानीय परिस्थितियों के लिए ${p} का उपयोग कर रहा हूँ। आज आप किस बारे में मार्गदर्शन चाहेंगे?`,
  te: (p) => `అర్థమయింది — మీ స్థానిక పరిస్థితుల కోసం ${p} ఉపయోగిస్తున్నాను. ఈరోజు మీకు ఏ విషయంపై మార్గదర్శనం కావాలి?`,
  ar: (p) => `تم — سأستخدم ${p} لظروفك المحلية. بأي شيء تودّ أن أرشدك اليوم؟`,
};

const RATE_LIMITED: Record<SupportedLocale, string> = {
  en: "You've reached today's free guidance limit. Please try again tomorrow.",
  hi: "आपकी आज की निःशुल्क मार्गदर्शन सीमा समाप्त हो गई है। कृपया कल पुनः प्रयास करें।",
  te: "మీరు నేటి ఉచిత మార్గదర్శన పరిమితిని చేరుకున్నారు. దయచేసి రేపు మళ్లీ ప్రయత్నించండి.",
  ar: "لقد وصلت إلى حد الإرشاد المجاني لهذا اليوم. يرجى المحاولة مرة أخرى غدًا.",
};

const GENERIC_ERROR: Record<SupportedLocale, string> = {
  en: "Sorry, dayli is having trouble right now. Please try again in a few minutes.",
  hi: "क्षमा करें, dayli को अभी कोई समस्या आ रही है। कृपया कुछ मिनट बाद पुनः प्रयास करें।",
  te: "క్షమించండి, dayliలో ప్రస్తుతం సమస్య ఉంది. దయచేసి కొన్ని నిమిషాల తర్వాత మళ్లీ ప్రయత్నించండి.",
  ar: "عذراً، يواجه dayli مشكلة الآن. يرجى المحاولة مرة أخرى بعد دقائق قليلة.",
};

// --- DB helpers ------------------------------------------------------------

async function getOrCreateConversation(opts: {
  phoneHash: string;
  waIdHash: string | null;
  displayName: string | null;
  locale: SupportedLocale;
}): Promise<WhatsappConversation> {
  const { phoneHash, waIdHash, displayName, locale } = opts;
  const existing = await db
    .select()
    .from(whatsappConversationsTable)
    .where(eq(whatsappConversationsTable.phoneHash, phoneHash))
    .limit(1);
  if (existing[0]) return existing[0];
  // Race-safe insert: another concurrent webhook for the same phone
  // could insert the row between our SELECT and our INSERT. The
  // `phoneHash` column has a unique constraint, so we use
  // `ON CONFLICT DO NOTHING` and re-SELECT the loser's row instead of
  // letting a unique-violation bubble up and get the message dropped.
  const inserted = await db
    .insert(whatsappConversationsTable)
    .values({
      phoneHash,
      waIdHash,
      displayName,
      locale,
      onboardingState: "new",
      history: [],
    })
    .onConflictDoNothing({ target: whatsappConversationsTable.phoneHash })
    .returning();
  if (inserted[0]) return inserted[0];
  const refetched = await db
    .select()
    .from(whatsappConversationsTable)
    .where(eq(whatsappConversationsTable.phoneHash, phoneHash))
    .limit(1);
  if (!refetched[0]) {
    // Should be impossible (unique constraint guarantees the row now
    // exists), but throw rather than silently drop.
    throw new Error("getOrCreateConversation: row missing after upsert");
  }
  return refetched[0];
}

function readHistory(conv: WhatsappConversation): WhatsappHistoryEntry[] {
  const raw = conv.history;
  if (!Array.isArray(raw)) return [];
  return raw.filter((e): e is WhatsappHistoryEntry => {
    if (!e || typeof e !== "object") return false;
    const role = (e as { role?: unknown }).role;
    const content = (e as { content?: unknown }).content;
    const ts = (e as { ts?: unknown }).ts;
    if (role !== "user" && role !== "assistant") return false;
    if (typeof content !== "string" || content.length === 0) return false;
    if (typeof ts !== "string") return false;
    return true;
  });
}

function readLocation(conv: WhatsappConversation): WhatsappLocation | null {
  const raw = conv.location;
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.lat !== "number" || typeof r.lon !== "number") return null;
  return {
    lat: r.lat,
    lon: r.lon,
    city: typeof r.city === "string" ? r.city : null,
    country: typeof r.country === "string" ? r.country : null,
    source: r.source === "detected" ? "detected" : "onboarding",
  };
}

/**
 * Per-user daily counter. Resets after 24h. We use a row-level counter
 * (not the in-memory IP limiter the rest of the API uses) because
 * WhatsApp users come in over a single Meta-controlled IP and we want
 * to limit per phone instead.
 */
function checkAndBumpDaily(conv: WhatsappConversation): {
  allowed: boolean;
  newCount: number;
  newWindowStart: Date;
} {
  const now = new Date();
  const windowMs = 24 * 60 * 60 * 1000;
  const start = conv.dailyWindowStartedAt ? new Date(conv.dailyWindowStartedAt) : null;
  if (!start || now.getTime() - start.getTime() >= windowMs) {
    return { allowed: true, newCount: 1, newWindowStart: now };
  }
  if (conv.dailyReplyCount >= PER_USER_DAILY_LIMIT) {
    return { allowed: false, newCount: conv.dailyReplyCount, newWindowStart: start };
  }
  return { allowed: true, newCount: conv.dailyReplyCount + 1, newWindowStart: start };
}

// --- main handler ---------------------------------------------------------

interface IncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body?: string };
}

interface IncomingValue {
  messaging_product?: string;
  metadata?: { display_phone_number?: string; phone_number_id?: string };
  contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
  messages?: IncomingMessage[];
}

interface IncomingChange {
  field?: string;
  value?: IncomingValue;
}

interface IncomingEntry {
  id?: string;
  changes?: IncomingChange[];
}

interface IncomingPayload {
  object?: string;
  entry?: IncomingEntry[];
}

router.get("/whatsapp/webhook", (req, res) => {
  const config = loadWhatsappConfig();
  if (!config) {
    res.status(503).send("whatsapp integration disabled");
    return;
  }
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && typeof token === "string" && token === config.verifyToken) {
    res.status(200).type("text/plain").send(typeof challenge === "string" ? challenge : "");
    return;
  }
  res.status(403).send("forbidden");
});

router.post("/whatsapp/webhook", async (req, res) => {
  const config = loadWhatsappConfig();
  if (!config) {
    res.status(503).json({ error: "whatsapp_disabled" });
    return;
  }

  // Reject any post that we cannot signature-verify. Meta retries on
  // non-2xx, so 401 is appropriate for forged requests; we still return
  // 200 quickly for legit posts so Meta doesn't queue retries.
  const rawBody =
    (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
  const signature = req.header("x-hub-signature-256");
  if (!verifyMetaSignature(rawBody, signature, config.appSecret)) {
    logger.warn({ ip: req.ip }, "whatsapp webhook signature mismatch");
    res.status(401).json({ error: "invalid_signature" });
    return;
  }

  // Acknowledge to Meta IMMEDIATELY so they don't retry. Real work runs
  // in the background — if it fails the user gets a generic apology DM
  // but Meta sees a fast 200.
  res.status(200).json({ received: true });

  const payload = req.body as IncomingPayload;
  if (payload?.object !== "whatsapp_business_account") return;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value?.messages) continue;
      for (const msg of value.messages) {
        // Fire-and-forget; never await across messages because Meta
        // batches up to ~25 events per delivery.
        handleIncomingMessage(msg, value, config).catch((err: unknown) => {
          logger.error({ err }, "whatsapp handler crashed");
        });
      }
    }
  }
});

async function handleIncomingMessage(
  msg: IncomingMessage,
  value: IncomingValue,
  config: WhatsappConfig,
): Promise<void> {
  if (msg.type !== "text" || !msg.text?.body) {
    // We only support text in the MVP; silently ignore other types
    // (interactive replies, status updates, media, etc.).
    return;
  }
  const userText = msg.text.body.trim();
  if (userText.length === 0) return;

  const fromPhone = msg.from;
  if (!fromPhone) return;

  const phoneHash = hashPhoneNumber(fromPhone, config.hashSalt);

  // Idempotency: Meta retries webhook posts on any non-2xx and can
  // re-deliver events even after a 200. We INSERT the message id into a
  // unique-indexed dedup table; on conflict we know we've already
  // processed this exact delivery and silently return. This prevents
  // duplicate AI spend, duplicate replies to the user, and double-bumped
  // counters / history. We only dedupe when Meta gave us an id (it
  // always does for `messages[]` events, but defend in depth).
  if (msg.id) {
    try {
      const claimed = await db
        .insert(whatsappProcessedMessagesTable)
        .values({ messageId: msg.id, phoneHash })
        .onConflictDoNothing({ target: whatsappProcessedMessagesTable.messageId })
        .returning({ id: whatsappProcessedMessagesTable.id });
      if (claimed.length === 0) {
        logger.info({ messageId: msg.id }, "whatsapp duplicate delivery suppressed");
        return;
      }
    } catch (err) {
      // If the dedup write itself fails (DB blip), prefer to skip rather
      // than risk a duplicate. Meta will retry.
      logger.error({ err, messageId: msg.id }, "whatsapp dedup write failed; skipping");
      return;
    }
  }

  // Wrap everything from here in a try / catch / finally so that any
  // post-dedup failure (DB blip, geocode crash, send rejection, ...)
  // releases the dedup row and lets Meta's next retry actually reach
  // the user. Without this any unhandled throw between dedup-claim and
  // successful reply would silently drop the message.
  let userReplied = false;
  try {
    userReplied = await processClaimedMessage({
      msg,
      value,
      config,
      userText,
      fromPhone,
      phoneHash,
    });
  } catch (err) {
    logger.error({ err, messageId: msg.id }, "whatsapp processing threw");
  } finally {
    if (!userReplied) {
      // No reply went out — release dedup so Meta's retry can try again.
      // (If the apology message reached the user inside processClaimed
      // ...Message that path returns true and we keep dedup.)
      await releaseDedup(msg.id);
    }
  }
}

/**
 * The post-dedup processing. Returns `true` iff we successfully sent
 * SOME message (success, apology, or rate-limit notice) to the user, in
 * which case the caller keeps the dedup row. Returns `false` if no
 * outbound message was delivered, signalling the caller to release the
 * dedup row so Meta's retry can reach the next attempt.
 */
async function processClaimedMessage(opts: {
  msg: IncomingMessage;
  value: IncomingValue;
  config: WhatsappConfig;
  userText: string;
  fromPhone: string;
  phoneHash: string;
}): Promise<boolean> {
  const { value, config, userText, fromPhone, phoneHash } = opts;
  const contact = value.contacts?.[0];
  const waId = contact?.wa_id ?? null;
  const waIdHash = waId ? hashPhoneNumber(waId, config.hashSalt) : null;
  const displayName = contact?.profile?.name ?? null;

  const detected = detectLocale(userText, "en");

  const conv = await getOrCreateConversation({
    phoneHash,
    waIdHash,
    displayName,
    locale: detected,
  });

  const locale: SupportedLocale = SUPPORTED_LOCALES.includes(detected)
    ? detected
    : (conv.locale as SupportedLocale) ?? "en";

  // Emergency short-circuit (deterministic, never reaches the model).
  if (isEmergency(userText)) {
    const sent = await safeSendBool(config, fromPhone, emergencyReply(locale));
    if (sent) {
      await persistTurn(conv, locale, userText, emergencyReply(locale), readLocation(conv));
    }
    return sent;
  }

  // Onboarding state machine.
  if (conv.onboardingState === "new") {
    const sent = await safeSendBool(config, fromPhone, ONBOARDING_GREETING[locale]);
    if (!sent) return false;
    // Post-send persistence is best-effort: if it throws we still
    // return true so the outer wrapper KEEPS the dedup row, otherwise
    // Meta would retry and the user would receive a duplicate greeting.
    await safePersist(() =>
      db
        .update(whatsappConversationsTable)
        .set({
          onboardingState: "awaiting_location",
          locale,
          lastInboundAt: new Date(),
          lastOutboundAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(whatsappConversationsTable.id, conv.id)),
    );
    return true;
  }

  if (conv.onboardingState === "awaiting_location") {
    const place = await geocodePlace(userText);
    if (!place) {
      const sent = await safeSendBool(config, fromPhone, ONBOARDING_NOT_FOUND[locale]);
      if (!sent) return false;
      await safePersist(() =>
        db
          .update(whatsappConversationsTable)
          .set({
            locale,
            lastInboundAt: new Date(),
            lastOutboundAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(whatsappConversationsTable.id, conv.id)),
      );
      return true;
    }
    const location: WhatsappLocation = {
      lat: place.lat,
      lon: place.lon,
      city: place.city,
      country: place.country,
      source: "onboarding",
    };
    const placeLabel = place.city ?? `${place.lat.toFixed(2)}, ${place.lon.toFixed(2)}`;
    const sent = await safeSendBool(config, fromPhone, ONBOARDING_CONFIRMED[locale](placeLabel));
    if (!sent) return false;
    await safePersist(() =>
      db
        .update(whatsappConversationsTable)
        .set({
          onboardingState: "ready",
          locale,
          location,
          lastInboundAt: new Date(),
          lastOutboundAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(whatsappConversationsTable.id, conv.id)),
    );
    return true;
  }

  // Conversational mode.
  //
  // Atomic-claim a daily-rate slot. We open a transaction, take a row
  // lock on the conversation (`SELECT ... FOR UPDATE`), read the FRESH
  // counter (NOT the stale one we read above into `conv`), and bump it
  // inside the SAME transaction so the counter increment commits before
  // any other webhook handler can see the row. Without bumping inside
  // the transaction, two concurrent deliveries for the same user would
  // both read the same prior count and both proceed.
  //
  // The AI call itself happens AFTER the transaction commits, so we are
  // not holding a row lock for several seconds.
  const claim = await db.transaction(async (tx) => {
    // Use the typed query API (NOT raw `tx.execute(sql\`select * ...\`)`)
    // because raw execute returns snake_case column names and we need
    // the camelCase fields (`dailyReplyCount`, `dailyWindowStartedAt`)
    // to feed `checkAndBumpDaily`. `.for("update")` adds the
    // `SELECT ... FOR UPDATE` row-lock clause.
    const locked = await tx
      .select()
      .from(whatsappConversationsTable)
      .where(eq(whatsappConversationsTable.id, conv.id))
      .for("update");
    const fresh = locked[0] ?? conv;
    const limit = checkAndBumpDaily(fresh);
    if (!limit.allowed) return null;
    await tx
      .update(whatsappConversationsTable)
      .set({
        locale,
        dailyReplyCount: limit.newCount,
        dailyWindowStartedAt: limit.newWindowStart,
        lastInboundAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(whatsappConversationsTable.id, conv.id));
    return { fresh, newCount: limit.newCount };
  });

  if (!claim) {
    return await safeSendBool(config, fromPhone, RATE_LIMITED[locale]);
  }

  const fresh = claim.fresh;
  const location = readLocation(fresh);
  let conditions = null;
  if (location) {
    try {
      conditions = await fetchConditions(location.lat, location.lon, location.city, location.country);
    } catch (err) {
      logger.warn({ err }, "conditions lookup failed in whatsapp handler");
    }
  }

  const history = readHistory(fresh);
  let reply: string;
  try {
    reply = await runCopilotOnce({
      locale,
      audience: null,
      conditions,
      history,
      userMessage: userText,
      channel: "whatsapp",
    });
  } catch (err) {
    logger.error({ err }, "copilot failed for whatsapp");
    // Try to apologise to the user; if even that fails the outer
    // wrapper will release dedup and Meta will retry.
    return await safeSendBool(config, fromPhone, GENERIC_ERROR[locale]);
  }

  // Trim very long replies to a reasonable WhatsApp size (Meta's hard
  // cap is 4096 chars; we cut earlier to keep things readable in chat).
  const trimmed = reply.length > 1500 ? `${reply.slice(0, 1480).trimEnd()}…` : reply;
  const sent = await safeSendBool(config, fromPhone, trimmed);
  if (!sent) return false;

  // Best-effort: history loss is preferable to a duplicate reply.
  await safePersist(() =>
    db
      .update(whatsappConversationsTable)
      .set({
        history: appendHistory(history, userText, trimmed),
        lastOutboundAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(whatsappConversationsTable.id, conv.id)),
  );
  return true;
}

/**
 * Run a post-send DB write that is best-effort: log on failure and
 * swallow the error so the caller can keep its dedup row. Without this
 * a transient DB blip after a successful WhatsApp send would cause
 * `processClaimedMessage` to throw, the outer wrapper to release dedup,
 * and Meta's retry to deliver a duplicate user-visible reply.
 */
async function safePersist<T>(fn: () => Promise<T>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    logger.warn({ err }, "whatsapp post-send persistence failed (non-fatal)");
  }
}

/**
 * Compensating delete for the dedup row. Used when our processing
 * failed AFTER we marked the message as processed but BEFORE we managed
 * to send a reply to the user. Without this, the next Meta retry would
 * be silently suppressed and the user would never hear back.
 */
async function releaseDedup(messageId: string | undefined): Promise<void> {
  if (!messageId) return;
  try {
    await db
      .delete(whatsappProcessedMessagesTable)
      .where(eq(whatsappProcessedMessagesTable.messageId, messageId));
  } catch (err) {
    logger.warn({ err, messageId }, "whatsapp releaseDedup failed");
  }
}

function appendHistory(
  history: WhatsappHistoryEntry[],
  userText: string,
  assistantText: string,
): WhatsappHistoryEntry[] {
  const now = new Date().toISOString();
  const next: WhatsappHistoryEntry[] = [
    ...history,
    { role: "user", content: userText, ts: now },
    { role: "assistant", content: assistantText, ts: now },
  ];
  return next.slice(-HISTORY_CAP);
}

async function persistTurn(
  conv: WhatsappConversation,
  locale: SupportedLocale,
  userText: string,
  assistantText: string,
  _location: WhatsappLocation | null,
): Promise<void> {
  try {
    const history = readHistory(conv);
    await db
      .update(whatsappConversationsTable)
      .set({
        locale,
        history: appendHistory(history, userText, assistantText),
        lastInboundAt: new Date(),
        lastOutboundAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(whatsappConversationsTable.id, conv.id));
  } catch (err) {
    logger.warn({ err }, "whatsapp persistTurn failed");
  }
}

/**
 * Send a WhatsApp text and report whether delivery actually succeeded so
 * the caller can decide whether to release the dedup row for a Meta
 * retry. Errors are logged, never re-thrown.
 */
async function safeSendBool(config: WhatsappConfig, to: string, body: string): Promise<boolean> {
  try {
    await sendWhatsappText({ config, to, body });
    return true;
  } catch (err) {
    logger.error({ err }, "whatsapp send failed (non-suppressed)");
    return false;
  }
}

// Module-load self-check: surface obvious config drift early in dev.
// The signature checker is the single most security-critical call in
// this file, so we sanity-check it under a known-good fixture at boot.
(function selfTest() {
  try {
    const body = Buffer.from(JSON.stringify({ ok: true }));
    const sig =
      "sha256=" + crypto.createHmac("sha256", "test-secret").update(body).digest("hex");
    if (!verifyMetaSignature(body, sig, "test-secret")) {
      logger.error("whatsapp verifyMetaSignature self-test FAILED");
    }
    if (verifyMetaSignature(body, sig, "wrong-secret")) {
      logger.error("whatsapp verifyMetaSignature accepts wrong secret — FAILED");
    }
  } catch (err) {
    logger.warn({ err }, "whatsapp self-test threw");
  }
})();

export default router;
