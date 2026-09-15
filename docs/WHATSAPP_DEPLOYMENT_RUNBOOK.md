# Deploying dayli.ai to WhatsApp — Production Runbook

Target architecture: **Meta WhatsApp Business Cloud API** → **Vercel serverless webhook** → existing AI + clinical safety pipeline.

```
WhatsApp user
     │  (inbound message)
     ▼
Meta Cloud API ──POST──► https://<your-domain>/api/webhook
                              │ 1. HMAC SHA-256 verify (x-hub-signature-256)
                              │ 2. normalizeMetaWebhook()
                              │ 3. idempotency check (message_id)
                              │ 4. sessionManager + climate context
                              │ 5. aiOrchestrator + clinical safety layer
                              ▼
Meta Cloud API ◄──POST── MetaWhatsAppProvider (Graph v19.0)
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

## Phase 2 — Deploy the backend

1. **Initialise git and push** (a `.gitignore` protecting `.env` has been added — verify `.env` is not staged):

   ```bash
   cd "path/to/Dayli AI"
   git init && git add -A && git status   # confirm .env is NOT listed
   git commit -m "Add Meta WhatsApp webhook endpoint"
   ```

   Push to a GitHub repo, then import it at [vercel.com/new](https://vercel.com/new).

2. **Set environment variables** in Vercel → Project → Settings → Environment Variables (Production scope). Use the *server-only* names — no `VITE_` prefix:

   | Variable | Value |
   |---|---|
   | `META_WHATSAPP_ACCESS_TOKEN` | permanent System User token |
   | `META_WHATSAPP_PHONE_NUMBER_ID` | numeric phone number ID |
   | `META_WHATSAPP_VERIFY_TOKEN` | any string you invent |
   | `META_WHATSAPP_APP_SECRET` | from App Dashboard → Basic |
   | `MESSAGE_PROVIDER` | `meta` |
   | `DAYLI_INTERNAL_API_KEY` | `openssl rand -hex 32` |
   | `OPENAI_API_KEY` | your AI inference key |
   | `WEATHER_API_KEY` | your weather provider key |
   | `VITE_MESSAGE_PROVIDER` | `mock` ← keeps the public demo UI from sending real messages |

3. **Deploy**, then confirm the handshake responds before touching Meta:

   ```bash
   curl "https://<your-domain>/api/webhook?hub.mode=subscribe&hub.verify_token=<YOUR_VERIFY_TOKEN>&hub.challenge=12345"
   # expected output:  12345
   ```

   A `403` means `META_WHATSAPP_VERIFY_TOKEN` in Vercel doesn't match what you passed.

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
2. Source the copy from `whatsapp_templates.md` and `src/templates/whatsappTemplates.ts`
3. Categorise carefully: **Utility** for health alerts tied to user opt-in, **Marketing** for anything promotional. Miscategorisation is the most common rejection reason.
4. Health-adjacent content gets extra scrutiny — avoid diagnostic claims in template bodies. Keep clinical detail in the *reply* (inside the 24h window), not the template.
5. Approval typically takes minutes to 24 hours. Send approved templates via:

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
3. Watch Vercel → Deployments → *Functions* logs for the inbound POST.
4. You should receive an AI-generated reply.

Test each path: plain text, a button reply, a shared GPS location, and a red-flag symptom phrase (confirm the clinical safety layer escalates to referral).

---

## Known limitations to resolve before real patient traffic

These are architectural gaps, not bugs — flagging them explicitly.

1. **Session state is in-memory.** `sessionManager` and `idempotencyEngine` use a JS `Map`. Serverless functions are ephemeral, so conversation history and duplicate-suppression are lost between cold starts, and concurrent instances don't share state. **Consequence:** users may get re-greeted mid-conversation, and a Meta webhook retry could double-send a reply. Fix by backing both with Vercel KV / Upstash Redis before launch.

2. **Cold-start latency.** First invocation after idle adds 1–3s on top of the AI call. The handler has a 15s internal budget against Meta's ~20s retry threshold, but a slow AI provider on a cold start could exceed it.

3. **Messaging limits.** Unverified businesses start at 250 unique recipients / 24h. Business verification plus quality-rating history raises this to 1K → 10K → 100K → unlimited.

4. **Health data compliance.** WhatsApp is not a HIPAA-covered channel and Meta will not sign a BAA. If dayli handles identifiable patient health data in a regulated jurisdiction, get legal review of consent language and data retention before onboarding real users. The existing consent template is a good start but is not sufficient on its own.

5. **The `whatsapp-bridge/` directory is now legacy.** It uses `whatsapp-web.js`, which is unofficial and risks account bans. Keep it for local demos only; it should not run in production.

---

## Rollback

Set `MESSAGE_PROVIDER=mock` in Vercel and redeploy. The webhook keeps ack-ing (so Meta stops retrying and your quality rating is unaffected) but all sends route to the mock provider instead of real users.
