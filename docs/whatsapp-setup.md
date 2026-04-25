# dayli WhatsApp Business API — founder runbook

This document is for the founder. It covers everything that has to happen
on **Meta's side** before users can text the dayli copilot from their own
phones. Once these steps are done, the integration runs end-to-end through
code that is already shipped (`artifacts/api-server/src/routes/whatsapp.ts`).

The integration is **feature-flagged**: with no Meta secrets set, the rest
of the website keeps working unchanged and the "Start on WhatsApp" CTAs
render in their disabled "setup in progress" state from the MVP. Adding
the secrets below is what flips the whole thing on.

## Required secrets (paste into Replit Secrets)

| Secret | What it is | Where to find it |
| --- | --- | --- |
| `META_WHATSAPP_TOKEN` | Permanent system-user access token with `whatsapp_business_messaging` and `whatsapp_business_management` scopes. | Meta Business Manager → Business settings → Users → System users → Generate token. |
| `META_WHATSAPP_PHONE_NUMBER_ID` | Numeric phone-number ID of the WhatsApp number you claimed (NOT the dialable phone number itself). | Meta App → WhatsApp → API setup → "Phone number ID". |
| `META_WHATSAPP_VERIFY_TOKEN` | Any random string YOU pick. Meta will echo it back during the webhook handshake to prove the URL belongs to you. | Generate it yourself (`openssl rand -hex 32` is fine). Paste the same value into Meta's webhook config and into Replit Secrets. |
| `META_WHATSAPP_APP_SECRET` | App secret of the Meta App that owns the WhatsApp product. Used to verify every incoming webhook POST via HMAC-SHA256. | Meta App → Settings → Basic → "App secret" → Show. |
| `META_WHATSAPP_HASH_SALT` | Random salt used to HMAC-SHA256 every user's phone number before persisting it to our DB. We never store raw E.164 numbers. | Generate it yourself (`openssl rand -hex 32`). DO NOT rotate casually — rotating it orphans every existing conversation row. |
| `WHATSAPP_DISPLAY_NUMBER` | Public dialable WhatsApp number (international form, **digits only, no `+`**). The api-server's `/api/whatsapp/status` endpoint uses this to tell the website whether to enable the "Start on WhatsApp" CTAs. | Same number you claimed in step 3, formatted as digits only (e.g. `919999999999`). |

Optional secrets (sane defaults shipped):

| Secret | Default | Purpose |
| --- | --- | --- |
| `META_WHATSAPP_GRAPH_VERSION` | `v23.0` | Pinned Meta Graph API version. Bump when Meta deprecates the current one. |
| `META_WHATSAPP_ONBOARDING_TEMPLATE` | `dayli_onboarding_v1` | Name of the approved Meta template used for first-touch outbound messaging. |
| `META_WHATSAPP_ONBOARDING_LANGUAGE` | `en` | Locale code for the template. |

## One-time Meta setup (do these in order)

### 1. Verify your business in Meta Business Manager

1. Go to <https://business.facebook.com/>.
2. Business settings → Business info → Start verification.
3. Upload the founder's government ID, the company registration document,
   and proof of address. Meta usually responds within 1–3 business days.

You **cannot** message users from a real phone number until the business
is verified. (You can still develop against a Meta-provided test number
in the meantime — the test number can message up to 5 verified phone
numbers without any approval.)

### 2. Create the Meta App that owns WhatsApp

1. <https://developers.facebook.com/apps/> → Create app → "Other" → "Business".
2. App name: `dayli` (or anything internal). Contact email: founder.
3. On the app dashboard, "Add product" → **WhatsApp** → Set up.
4. Link the app to the verified Business Manager from step 1.

### 3. Claim the phone number

1. Inside the WhatsApp product → "API setup" → "Add phone number".
2. Add the number you want users to text (must be a number you control
   that has **never** been used on consumer WhatsApp).
3. Verify it via SMS or voice call.
4. Note the **phone number ID** — that's `META_WHATSAPP_PHONE_NUMBER_ID`.

### 4. Generate a permanent access token

Temporary tokens expire every 24h, which is a debugging nightmare.
Generate a permanent system-user token instead:

1. Business settings → Users → System users → Add → "dayli-server" with
   role "Admin".
2. Add Assets → assign the Meta App from step 2 with "Manage app".
3. "Generate new token" → select the Meta App → tick
   `whatsapp_business_messaging` AND `whatsapp_business_management` →
   Token expiration: "Never".
4. Copy the token. This is `META_WHATSAPP_TOKEN`.

### 5. Configure the webhook

1. Inside the WhatsApp product → "Configuration" (or "Webhooks").
2. Callback URL: `https://<your-deployment>.replit.app/api/whatsapp/webhook`
   (or whatever your custom domain is — must be HTTPS and publicly
   reachable; the local dev server is not).
3. Verify token: paste the same random string you saved as
   `META_WHATSAPP_VERIFY_TOKEN`.
4. Click "Verify and save". Meta will GET the URL with a `hub.challenge`;
   our handler echoes it back if the verify token matches. If verification
   fails, double-check that the secret in Replit matches the one you
   typed into Meta exactly (no trailing whitespace).
5. Subscribe to the **`messages`** field under "WhatsApp Business Account".

### 6. App secret + hash salt

1. Meta App → Settings → Basic → "App secret" → "Show" → copy. Paste as
   `META_WHATSAPP_APP_SECRET` in Replit Secrets. Without this, every
   webhook POST will be rejected with 401 (we verify HMAC).
2. Generate `META_WHATSAPP_HASH_SALT` yourself (e.g.
   `openssl rand -hex 32`) and paste it in Replit Secrets. Treat it like
   a database key — losing it does not break anything immediately, but
   rotating it orphans existing conversation rows because the new salt
   produces different hashes.

### 7. Onboarding template (REQUIRED for first-touch greeting)

dayli's first reply to any new user is sent as an approved Meta
template message. This is a hard product requirement — until the
template below is approved in your WhatsApp Manager, the first message
that reaches a brand-new user will fall back to a free-form text reply
(the api-server will log a warning and you should treat this as a
high-priority issue, not a steady state).

For *return* users (anyone past the onboarding step) we reply with
free-form text inside Meta's 24h "service window", which does not
require a template. For *outbound-first* messages (e.g. you want to
push a heat advisory to a user who has not messaged us in 24h) Meta
also requires a template, and the same approved template can be reused.

To get the template approved:

1. WhatsApp Manager → Message templates → Create template.
2. Category: `UTILITY`. Name: `dayli_onboarding_v1` (must match
   `META_WHATSAPP_ONBOARDING_TEMPLATE`).
3. Language: English (must match `META_WHATSAPP_ONBOARDING_LANGUAGE`,
   default `en`).
4. Body: a plain "Welcome to dayli — please reply with your city or
   pincode" prompt. No variables.
5. Submit. Approval typically takes a few hours.
6. Once approved, the api-server will automatically use the template
   on every first-touch interaction; no code change needed.

Localizing the template into Hindi / Telugu / Arabic is a per-locale
Meta approval — out of scope for this task. The free-form fallback in
locale-aware text covers those users until the localized templates
exist.

## Wiring the website CTAs

There are TWO env vars involved in the website CTAs and they must be
set together:

| Variable | Where | Purpose |
|---|---|---|
| `WHATSAPP_DISPLAY_NUMBER` | api-server (Replit Secrets) | International form, **digits only, no `+`** (e.g. `919999999999`). The api-server's public `/api/whatsapp/status` endpoint reads this and tells the website. |
| `VITE_WHATSAPP_NUMBER` | dayli-website (Replit Secrets, prefix `VITE_`) | Same value as `WHATSAPP_DISPLAY_NUMBER`. Build-time fallback used only if the website cannot reach the api-server's status endpoint. |

The CTA enabled state is **driven by the api-server**, not by the
build-time env var: even if `VITE_WHATSAPP_NUMBER` is set, the CTA will
stay in the "setup in progress" state unless ALL FIVE Meta secrets
above are also set (i.e. unless the webhook would actually accept
calls). This prevents users from being deep-linked into a WhatsApp
chat whose webhook would 503.

## Verifying the integration end-to-end

After all five secrets are in Replit and the workflow has restarted:

1. **Webhook verification**:
   ```
   curl -i 'https://<your-deployment>/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=<your-verify-token>&hub.challenge=hello'
   ```
   Should return `200` with body `hello`.

2. **Signature gate**:
   ```
   curl -i -X POST -H 'content-type: application/json' \
     'https://<your-deployment>/api/whatsapp/webhook' -d '{}'
   ```
   Should return `401 invalid_signature` (proves we are rejecting
   forged posts).

3. **Real DM**: from your phone, WhatsApp the verified number with
   "hi". You should receive the localized onboarding greeting within a
   few seconds. Reply with a city or pincode (e.g. `Hyderabad` or
   `500032`); the bot should confirm the location. Then ask anything
   ("How should I dress my baby for today?") and you should get a
   climate-aware reply.

If a real DM never arrives, in order:

- Check Meta App → Webhooks → "Recent deliveries" for non-2xx responses.
- Check the `artifacts/api-server` workflow logs for
  `whatsapp webhook signature mismatch` (wrong app secret) or
  `whatsapp send-text failed` (wrong access token / phone number ID).
- Confirm `VITE_WHATSAPP_NUMBER` and the dialable number on Meta match.

## Operational notes

### Idempotency and retention

Every inbound webhook event is recorded in `whatsapp_processed_messages`
keyed on Meta's `messages[].id` (uniquely indexed). On any retry from
Meta the duplicate is suppressed before any AI work runs, so users never
get the same reply twice. If our handler fails AFTER claiming the dedup
row but BEFORE delivering a reply, the row is released so Meta's next
retry can succeed.

The dedup table grows roughly one row per inbound message. Add a
periodic cleanup job — for example a daily cron against the production
DB — to keep it bounded:

```sql
DELETE FROM whatsapp_processed_messages
 WHERE processed_at < NOW() - INTERVAL '14 days';
```

(There is an index on `processed_at` to make this fast.) 14 days is
much longer than any realistic Meta retry window.

### Per-user daily limit

Each conversation row tracks `daily_reply_count` and
`daily_window_started_at`. The counter increments on EVERY chargeable
outbound reply (AI answer, onboarding template, "couldn't understand"
notice — anything that opens or extends a Meta conversation window)
not only AI answers, so the cap is a true ceiling on cost per user.
The limit (`PER_USER_DAILY_LIMIT` in `routes/whatsapp.ts`) is enforced
atomically inside a `SELECT ... FOR UPDATE` transaction so concurrent
webhooks for the same phone cannot both slip past the cap. Emergency
replies are intentionally exempt from the limit and do NOT increment
the counter: a person in distress must always be able to receive the
"call your local emergency number" message.

### Reliability posture (accept-then-process)

The webhook returns `200` to Meta as soon as the HMAC signature checks
out, BEFORE the handler runs the AI / sends the reply / persists state.
This is a deliberate MVP trade-off: it keeps webhook latency well
inside Meta's 5 second timeout (so Meta does not retry healthy events)
at the cost of one failure mode — if the api-server crashes between
the ack and the outbound send, that single user message is lost
because Meta will not retry an event we already 200'd.

The dedup-release logic compensates for the more common case (handler
catches its own error, releases the dedup row, Meta's automatic retry
re-processes the same event) but does not cover process death between
ack and send. For the MVP this is acceptable because:
- WhatsApp users tend to retry by re-typing if they get no answer.
- Daily volume is low and the founder monitors the api-server logs.
- Moving to queue-backed processing (Redis / pg-boss / SQS) is the
  graduation step once volume justifies it; until then the cost
  outweighs the benefit.

Watch the api-server logs for `whatsapp processing threw` and
`whatsapp send failed` lines — sustained occurrences are the signal
that the queue-backed graduation is overdue.

## Code references

- `artifacts/api-server/src/routes/whatsapp.ts` — webhook handler, state
  machine, rate limiting.
- `artifacts/api-server/src/lib/whatsapp.ts` — Meta API client, HMAC
  verification, phone-number hashing, feature-flag loader.
- `artifacts/api-server/src/lib/copilot.ts` — shared system prompt and
  emergency keyword logic (web + WhatsApp use the same rules).
- `lib/db/src/schema/whatsapp.ts` — `whatsapp_conversations` table.
