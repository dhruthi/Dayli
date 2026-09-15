import { pgTable, serial, text, timestamp, jsonb, integer, index } from "drizzle-orm/pg-core";

/**
 * Per-WhatsApp-user conversation state. The user's actual phone number is
 * NEVER stored — we only persist a SHA-256 HMAC of it (keyed with
 * `META_WHATSAPP_HASH_SALT`) so logs and DB dumps cannot be used to
 * re-identify users. The current live phone number is kept on the inbound
 * webhook in memory just long enough to send the reply back via Meta.
 */
export const whatsappConversationsTable = pgTable("whatsapp_conversations", {
  id: serial("id").primaryKey(),
  /** SHA-256 HMAC of the E.164 phone number, hex-encoded. */
  phoneHash: text("phone_hash").notNull().unique(),
  /** WhatsApp's internal opaque ID for the user (`wa_id`). Useful for
   * de-duplication if salt rotates. Hashed to avoid storing the raw value. */
  waIdHash: text("wa_id_hash"),
  /** Display name as supplied by WhatsApp profile (optional). */
  displayName: text("display_name"),
  /** Locale resolved from the user's most recent message ("en"/"hi"/"te"/"ar"). */
  locale: text("locale").notNull().default("en"),
  /** Resolved location for personalised conditions. JSON of
   * { lat, lon, city, country, source: "onboarding"|"detected"|"pin" }. */
  location: jsonb("location"),
  /** Rolling message history, capped to the most recent ~20 turns at write
   * time. JSON of `[{ role: "user"|"assistant", content: string, ts: ISO }]`. */
  history: jsonb("history").notNull().default([]),
  /** Onboarding state machine: "new" → first inbound, send template asking
   * for city. "awaiting_location" → reply parsed as city/pincode. "ready" →
   * full conversational mode. */
  onboardingState: text("onboarding_state").notNull().default("new"),
  /** How many outbound WhatsApp replies we've sent to this user in the
   * current 24h window — counts every chargeable reply (AI answer,
   * onboarding template, "couldn't understand" notice, etc.) and is
   * capped at PER_USER_DAILY_LIMIT in `routes/whatsapp.ts` to bound
   * Meta conversation cost per user. Emergency replies are intentionally
   * exempt and do NOT increment this counter. */
  dailyReplyCount: integer("daily_reply_count").notNull().default(0),
  dailyWindowStartedAt: timestamp("daily_window_started_at", {
    withTimezone: true,
  }),
  lastInboundAt: timestamp("last_inbound_at", { withTimezone: true }),
  lastOutboundAt: timestamp("last_outbound_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WhatsappConversation = typeof whatsappConversationsTable.$inferSelect;
export type InsertWhatsappConversation = typeof whatsappConversationsTable.$inferInsert;

export interface WhatsappLocation {
  lat: number;
  lon: number;
  city: string | null;
  country: string | null;
  /** `pin` is a WhatsApp location share — exact coordinates, not a city centroid. */
  source: "onboarding" | "detected" | "pin";
}

export interface WhatsappHistoryEntry {
  role: "user" | "assistant";
  content: string;
  ts: string;
}

/**
 * Idempotency table for inbound WhatsApp webhook deliveries.
 *
 * Meta retries webhook POSTs on any non-2xx response and occasionally
 * redelivers events even after a 200 (network glitches, internal Meta
 * retries). Without dedup, the same `messages[].id` can be processed
 * multiple times → duplicate replies to the user, duplicate AI spend,
 * duplicate history entries, and double-bumped rate counters.
 *
 * We use a separate small table with a unique constraint on `messageId`.
 * The handler INSERTs first inside a transaction; on conflict we know
 * the message has already been processed and we return 200 without doing
 * any work.
 */
export const whatsappProcessedMessagesTable = pgTable(
  "whatsapp_processed_messages",
  {
    id: serial("id").primaryKey(),
    /** Meta-supplied unique message id (`messages[].id`). Globally unique
     * inside the WhatsApp Cloud API. */
    messageId: text("message_id").notNull().unique(),
    /** Phone hash of the sender, for diagnostic queries. */
    phoneHash: text("phone_hash"),
    processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Index supports a periodic retention purge (`DELETE WHERE
    // processed_at < now() - interval '14 days'`). Without retention the
    // table would grow unbounded; the founder runbook documents the
    // cleanup job operators should add for production.
    index("whatsapp_processed_messages_processed_at_idx").on(t.processedAt),
  ],
);

export type WhatsappProcessedMessage = typeof whatsappProcessedMessagesTable.$inferSelect;
