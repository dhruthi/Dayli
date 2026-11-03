# Meta WhatsApp Business Cloud API Integration

## 1. Overview
dayli.ai runs on the official **Meta WhatsApp Business Cloud API**. Inbound
messages arrive as webhooks; outbound messages go through the Graph API with a
server-only System User token. There is no unofficial client and no QR-linked
account anywhere in the path.

---

## 2. Inbound / Outbound Flow

```
Meta Cloud API ──POST──► /webhook  (or /api/webhook)
                            │ 1. HMAC SHA-256 verify (x-hub-signature-256)
                            │ 2. normalizeWebhook()          lib/inbound.js
                            │ 3. idempotency claim on message_id   lib/store.js
                            │ 4. rate limit (per sender + global)
                            │ 5. session & consent lookup    lib/store.js
                            │ 6. onboarding state machine    lib/onboarding.js
                            │    or AI pipeline + safety core
                            ▼
Meta Cloud API ◄──POST── CloudApiClient (Graph v21.0)   lib/cloudApi.js
```

Sends and scheduled reminders are queued through BullMQ when Redis is
configured, and processed inline when it is not.

---

## 3. Environment

All values are server-only. Nothing here is ever exposed to a client.

```bash
META_WHATSAPP_ACCESS_TOKEN=      # System User permanent token
META_WHATSAPP_PHONE_NUMBER_ID=   # numeric ID, not the phone number
META_WHATSAPP_VERIFY_TOKEN=      # any string; also typed into Meta's form
META_WHATSAPP_APP_SECRET=        # App Dashboard → Settings → Basic
META_GRAPH_VERSION=v21.0         # pin it; do not float
META_REENGAGEMENT_TEMPLATE=      # approved template for outside the 24h window
```

The server refuses to start without the verify token, phone number ID, access
token and an AI key. `META_APP_SECRET` is accepted as a legacy alias for
`META_WHATSAPP_APP_SECRET` so an existing deployment does not silently drop to
unverified on upgrade.

---

## 4. Webhook Registration

1. [developers.facebook.com](https://developers.facebook.com) → your app →
   **WhatsApp → Configuration → Webhook → Edit**
2. **Callback URL**: `https://<your-domain>/api/webhook`
3. **Verify token**: the exact value of `META_WHATSAPP_VERIFY_TOKEN`
4. **Verify and Save** — Meta issues a `GET` with `hub.challenge`
5. Under **Manage**, subscribe to:
   - `messages` — text, button replies, list selections, GPS pins
   - `message_template_status_update` — template approval events

---

## 5. Security & Idempotency

1. **Signature verification.** Every inbound `POST` is verified with HMAC
   SHA-256 over the raw request body against `META_WHATSAPP_APP_SECRET`.
   `ALLOW_UNVERIFIED_WEBHOOKS=true` disables this for a local tunnel only —
   never in production.
2. **Idempotency.** `Store.claimMessage()` atomically claims each Meta
   `message_id`; a duplicate claim is rejected. Meta retries webhook delivery,
   and without this a retry produces a second clinical reply.
3. **Rate limiting.** Per-sender and global inbound caps protect the number's
   quality rating. In-process today — move to Redis before scaling out.
4. **Secret isolation.** No token, secret or phone number ID is ever logged or
   returned by an endpoint. `GET /` reports only whether each is configured.
5. **Persistence.** Without `SESSION_STORE_URL`, sessions, consent records and
   idempotency keys live in process memory and are lost on restart and not
   shared between instances. The server warns loudly; do not run production
   traffic that way.

---

## 6. The 24-Hour Window

Free-form text may only be sent within 24 hours of the user's last inbound
message. Outside it, only a pre-approved template will deliver.
`deliver()` checks `Store.isWindowOpen()` before every send and substitutes
`META_REENGAGEMENT_TEMPLATE` when the window has closed; with no template
configured the send is refused rather than silently failing. `CloudApiClient`
additionally classifies Meta's window-closed error codes (`131047`, `131051`).
Proactive sends — morning climate alerts,
adherence nudges — must always go out as templates. Template copy lives in
[`whatsapp_templates.md`](../whatsapp_templates.md).
