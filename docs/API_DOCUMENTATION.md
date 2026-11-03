# dayli.ai HTTP API

The service exposes a small surface: Meta's webhook, two status endpoints, and
one authenticated outbound endpoint. There is no public chat API — all
conversation happens over WhatsApp.

The webhook routes are served by `whatsapp-bridge/server.js`.
`POST /api/send-alert` is a **Vercel serverless function** (`api/send-alert.ts`).
It is not bundled into the container image, so the Docker and Render deployments
do not serve it — deploy it on Vercel, or port it onto the Express app as an
authenticated route.

---

## 1. Webhook verification

`GET /webhook` · `GET /api/webhook`

Meta's subscription handshake. Returns `hub.challenge` verbatim when
`hub.mode=subscribe` and `hub.verify_token` matches `META_WHATSAPP_VERIFY_TOKEN`.

```bash
curl "https://<host>/api/webhook?hub.mode=subscribe&hub.verify_token=<TOKEN>&hub.challenge=12345"
# → 12345
```

| Status | Meaning |
|---|---|
| `200` | Verified; body is the challenge |
| `403` | Verify token mismatch |
| `400` | `hub.mode` or `hub.verify_token` missing |

---

## 2. Inbound messages

`POST /webhook` · `POST /api/webhook`

Receives Meta message and status events. Every request is verified with
**HMAC SHA-256** over the raw body against `META_WHATSAPP_APP_SECRET`
(`x-hub-signature-256`); an unverified request is rejected, because an
unauthenticated webhook lets anyone put a phone number in the body and have this
service message it.

Processing order: signature → normalization → idempotency claim on `message_id`
→ per-sender and global rate limits → session/consent lookup → onboarding state
machine or AI pipeline → outbound send.

Subscribe to these webhook fields in the Meta App Dashboard:

- `messages` — text, button replies, list selections, GPS pins
- `message_template_status_update` — template approval events

---

## 3. Health

`GET /health`

```json
{
  "status": "ok",
  "service": "dayli.ai Climate Health Copilot",
  "version": "2.1.0",
  "timestamp": "2026-08-24T14:38:44.516Z",
  "store": "redis",
  "safetyRules": "v2.0.0"
}
```

Used by the container healthcheck and by Render's `healthCheckPath`.

---

## 4. Status

`GET /`

Public and unauthenticated. Reports **which** credentials are configured, never
their values.

```json
{
  "status": "online",
  "service": "dayli.ai WhatsApp Cloud Engine",
  "version": "2.1.0",
  "config": {
    "phoneNumberConfigured": true,
    "verifyTokenConfigured": true,
    "appSecretConfigured": true,
    "aiConfigured": true,
    "store": "redis",
    "safetyRules": "2.0.0"
  }
}
```

---

## 5. Outbound climate alert

`POST /api/send-alert`

Sends through the Meta Cloud API using the server-only access token.

**Auth:** header `x-dayli-api-key` must match `DAYLI_INTERNAL_API_KEY`.

> [!IMPORTANT]
> Meta permits free-form text only within **24 hours** of the user's last
> inbound message. Outside that window you must send a pre-approved template —
> which is what an unsolicited morning alert is. Pass `templateName` for those.

**Request**

```json
{
  "to": "919876543210",
  "city": "Hyderabad",
  "feelsLike": 44,
  "aqi": 168,
  "uvIndex": 9,
  "message": "optional — overrides the generated alert body",
  "templateName": "optional — sends a template instead of free text",
  "languageCode": "en_US"
}
```

`to` is required and is stripped to digits. With neither `message` nor
`templateName`, a formatted climate warning is built from `city`, `feelsLike`,
`aqi` and `uvIndex`.

**Response**

```json
{
  "success": true,
  "recipient": "919876543210",
  "messageId": "wamid.HBgM…",
  "latencyMs": 412,
  "timestamp": "2026-08-24T14:38:44.516Z"
}
```

| Status | Meaning |
|---|---|
| `200` | Sent |
| `400` | Invalid JSON, or `to` missing |
| `401` | Bad or missing `x-dayli-api-key` |
| `405` | Method other than POST |
| `500` | `DAYLI_INTERNAL_API_KEY` not configured, or dispatch threw |
| `502` | Meta Cloud API rejected the send (`error` carries the reason) |

```bash
curl -X POST https://<host>/api/send-alert \
  -H "Content-Type: application/json" \
  -H "x-dayli-api-key: $DAYLI_INTERNAL_API_KEY" \
  -d '{"to":"919876543210","templateName":"daily_climate_alert","languageCode":"en"}'
```

---

## 6. CORS & rate limits

- `ALLOWED_ORIGINS` is an exact-match, comma-separated list. No wildcards and no
  suffix matching — `.example.com` would let anyone who can register a subdomain
  through. Non-browser callers (no `Origin` header) are always allowed, since
  the webhook is a server-to-server call.
- Inbound is capped per sender (`RATE_LIMIT_PER_SENDER`, default 12/min) and
  globally (`RATE_LIMIT_GLOBAL`, default 300/min). The caps are in-process —
  move them to Redis before running multiple instances.
