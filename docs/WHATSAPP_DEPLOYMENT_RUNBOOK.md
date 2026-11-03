# Deploying dayli.ai to WhatsApp — Production Runbook

Target architecture: **Meta WhatsApp Business Cloud API** → **long-running Node
service** (`whatsapp-bridge/server.js`) backed by **Redis** → AI + clinical
safety pipeline.

```
WhatsApp user
     │  (inbound message)
     ▼
Meta Cloud API ──POST──► https://<your-domain>/api/webhook
                              │ 1. HMAC SHA-256 verify (x-hub-signature-256)
                              │ 2. normalizeWebhook()
                              │ 3. idempotency claim on message_id (Redis)
                              │ 4. rate limit → session & consent
                              │ 5. onboarding state machine, or
                              │    climate/clinic context + AI + safety core
                              ▼
Meta Cloud API ◄──POST── CloudApiClient (Graph v21.0)
     │
     ▼
WhatsApp user  (reply)
```

---

## Phase 1 — Meta Business setup

1. **Business verification.** At [business.facebook.com](https://business.facebook.com), create a Business Portfolio and complete **Business Verification** (Settings → Business Info). Requires legal entity documents. *Start this first — it can take several days and blocks your messaging tier upgrade.*

2. **Create the app.** [developers.facebook.com](https://developers.facebook.com) → My Apps → Create App → type **Business** → add the **WhatsApp** product.

3. **Phone number.** Under WhatsApp → API Setup, either use the free test number (limited to 5 pre-registered recipients) or click *Add phone number* to register a real one. The number must **not** have an active WhatsApp or WhatsApp Business account on it — deregister it in the app first.

4. **Copy the Phone number ID.** This is a numeric ID shown on the API Setup page. It is *not* the phone number itself. → `META_WHATSAPP_PHONE_NUMBER_ID`

5. **Permanent access token.** The token on the API Setup page expires in 24 hours — do not deploy with it.
   - Business Settings → **Users → System Users** → Add → assign role *Admin*
   - Click **Add Assets** → your WhatsApp Business Account → enable *Full control*
   - **Generate New Token** → select your app → scopes `whatsapp_business_messaging` + `whatsapp_business_management` → set expiry **Never**
   - → `META_WHATSAPP_ACCESS_TOKEN`

6. **App Secret.** App Dashboard → Settings → Basic → *App Secret* → Show. → `META_WHATSAPP_APP_SECRET`

---

## Phase 2 — Deploy the service

The service is a long-running Node process, not a serverless function. It needs
Redis: without it, sessions, consent records and idempotency keys are held in
process memory, lost on restart and unshared between instances — which means a
Meta webhook retry can produce a duplicate clinical reply.

### The Production Architecture (BO Blueprint)

The production architecture deploys a 3-container stack via Docker Compose:
- **`app` (`dayli_app_prod`)**: The Node.js application running BullMQ background workers and webhook processors.
- **`redis` (`dayli_redis_prod`)**: Persistent Redis instance with Append-Only File (AOF) disk storage for sessions, consent, and queue deduplication.
- **`caddy` (`dayli_caddy_prod`)**: Reverse proxy with automatic Let's Encrypt TLS (SSL) termination on ports 80/443.

```bash
# 1. Configure environment
cp .env.example .env       # fill in Meta credentials, AI keys, and DOMAIN_NAME

# 2. Deploy with one command
./scripts/deploy.sh
# or: npm run prod:up
```

This brings up the complete stack, runs health checks against `http://localhost:3000/health`, provisions HTTPS automatically via Caddy, and prints the verified webhook endpoints.

### Alternative — Zero-DevOps Cloud (Fly.io Mumbai)

If you prefer managed cloud hosting without managing a VPS, deploy to the Mumbai (`bom`) region using Fly.io:

```bash
fly launch --copy-config
fly redis create --region bom --name dayli-redis
fly deploy
```

### Required environment

| Variable | Value |
|---|---|
| `META_WHATSAPP_ACCESS_TOKEN` | permanent System User token |
| `META_WHATSAPP_PHONE_NUMBER_ID` | numeric phone number ID |
| `META_WHATSAPP_VERIFY_TOKEN` | any string you invent |
| `META_WHATSAPP_APP_SECRET` | from App Dashboard → Basic |
| `META_GRAPH_VERSION` | `v21.0` |
| `META_REENGAGEMENT_TEMPLATE` | approved template for outside the 24h window |
| `SESSION_STORE_URL` | Redis connection string |
| `OPENAI_API_KEY` | inference key (or `GROQ_API_KEY` / `XAI_API_KEY`) |
| `DAYLI_INTERNAL_API_KEY` | `openssl rand -hex 32` — protects `/api/send-alert` |
| `ALLOWED_ORIGINS` | exact origins, comma-separated |

The process refuses to start if the verify token, phone number ID, access token
or AI key is missing.

### Confirm the handshake before touching Meta

```bash
curl "https://<your-domain>/api/webhook?hub.mode=subscribe&hub.verify_token=<YOUR_VERIFY_TOKEN>&hub.challenge=12345"
# expected output:  12345

curl "https://<your-domain>/health"
# store must read "redis", not the in-memory label
```

A `403` means `META_WHATSAPP_VERIFY_TOKEN` on the server doesn't match what you
passed.

---

## Phase 3 — Register the webhook

1. App Dashboard → **WhatsApp → Configuration → Webhook → Edit**
2. Callback URL: `https://<your-domain>/api/webhook`
3. Verify token: the exact value of `META_WHATSAPP_VERIFY_TOKEN`
4. **Verify and Save** — Meta issues the GET request you just tested manually.
5. Click **Manage** on webhook fields and subscribe to:
   - `messages` — inbound text, button replies, list selections, GPS location
   - `message_template_status_update` — template approval notifications

---

## Phase 4 — Message templates

Meta permits free-form text **only within 24 hours** of a user's last inbound message. Every proactive message — morning climate alerts, adherence nudges — must be a pre-approved template.

1. Business Suite → WhatsApp Manager → **Message Templates → Create Template**
2. Source the copy from `whatsapp_templates.md`
3. Categorise carefully: **Utility** for health alerts tied to user opt-in, **Marketing** for anything promotional. Miscategorisation is the most common rejection reason.
4. Health-adjacent content gets extra scrutiny — avoid diagnostic claims in template bodies. Keep clinical detail in the *reply* (inside the 24h window), not the template.
5. Approval typically takes minutes to 24 hours. Send approved templates via
   `POST /api/send-alert`:

   > [!NOTE]
   > `api/send-alert.ts` is a **Vercel serverless function**. It is not part of
   > the container image and is not served by the Docker or Render deployment.
   > Deploy it separately on Vercel, or port it onto `whatsapp-bridge/server.js`
   > as an authenticated route if you want a single deployment target.


   ```bash
   curl -X POST https://<your-domain>/api/send-alert \
     -H "Content-Type: application/json" \
     -H "x-dayli-api-key: <DAYLI_INTERNAL_API_KEY>" \
     -d '{"to":"919876543210","templateName":"daily_climate_alert","languageCode":"en"}'
   ```

---

## Phase 5 — End-to-end test

1. Add your own number under WhatsApp → API Setup → *To* field (test numbers require this allowlisting).
2. Send `hi` from your phone to the business number.
3. Watch the service logs for the inbound POST (`docker compose logs -f app`, or the Render log stream).
4. You should receive an AI-generated reply.

Test each path: plain text, a button reply, a shared GPS location, and a red-flag symptom phrase (confirm the clinical safety layer escalates to referral).

---

## Known limitations to resolve before real patient traffic

These are architectural gaps, not bugs — flagging them explicitly.

1. **State is only as durable as Redis.** Sessions, consent records and
   idempotency keys live in `SESSION_STORE_URL`. Run without it and they fall
   back to process memory: users get re-greeted mid-conversation and a Meta
   webhook retry can double-send a reply. The server logs a loud warning when
   this happens — treat it as a launch blocker.

2. **Rate limits are per-process.** `RATE_LIMIT_PER_SENDER` and
   `RATE_LIMIT_GLOBAL` are enforced with in-process counters, so N instances
   permit N times the cap. Move them to Redis before scaling horizontally.

3. **Messaging limits.** Unverified businesses start at 250 unique recipients / 24h. Business verification plus quality-rating history raises this to 1K → 10K → 100K → unlimited.

4. **Health data compliance.** WhatsApp is not a HIPAA-covered channel and Meta will not sign a BAA. If dayli handles identifiable patient health data in a regulated jurisdiction, get legal review of consent language and data retention before onboarding real users. The existing consent template is a good start but is not sufficient on its own.

5. **Reply latency is unbounded by the AI provider.** A slow primary provider
   falls through to Gemini and then to the deterministic path, but the total can
   still approach Meta's retry threshold. Watch `[AI FALLBACK]` frequency in the
   logs.

---

## Rollback

Redeploy the previous image or commit. If you need to stop outbound messages
without dropping webhooks, unset `META_WHATSAPP_ACCESS_TOKEN` on the running
service: inbound requests are still acknowledged — so Meta stops retrying and
the number's quality rating is unaffected — while every send fails closed
instead of reaching a user.
