# whatsapp-bridge

The dayli.ai WhatsApp Business Cloud API service. This is the application — the
repository root is its build, deploy and documentation wrapper.

It talks to Meta's official Cloud API. There is no QR-linked account and no
unofficial WhatsApp client in this path.

## Modules

| File | Responsibility |
|---|---|
| `server.js` | Express app: webhook verification and receipt, rate limiting, climate and clinic enrichment, AI pipeline, outbound delivery, startup and shutdown |
| `lib/cloudApi.js` | Meta Graph API client — text, buttons, list, location request, template; retries and error-code classification |
| `lib/inbound.js` | Normalizes Meta webhook payloads; detects unreadable media |
| `lib/onboarding.js` | Consent and profile state machine (consent → subject → age/trimester → location) |
| `lib/store.js` | Sessions, consent records, capped history, idempotency claims, 24-hour window check — Redis, or in-process memory as a warned fallback |
| `lib/queues.js` / `lib/workers.js` | BullMQ message and reminder queues; inline processing when Redis is absent |
| `lib/redis.js` | Connection lifecycle |
| `lib/logger.js` | Structured pino logging |

Clinical safety lives one level up in [`../shared/safetyCore.js`](../shared/safetyCore.js)
so it can be shared and tested independently of transport.

## Running

Run it from the repository root — dependencies, scripts and `.env` live there:

```bash
npm install
npm run dev     # node --watch whatsapp-bridge/server.js
npm start       # production
```

`npm test` (root) covers the safety core, webhook normalization, and the store
and queue behaviour in `__tests__/`.

Configuration, endpoints and deployment are documented in the
[root README](../README.md) and [`../docs/`](../docs/).
