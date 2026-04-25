# dayli.ai marketing site

React + Vite single-page marketing site for dayli.ai (the AI Climate Health
Copilot for women and children). Hosts the public marketing pages, the
clinic / pharma lead-capture forms, the interactive AI chat demo on the
homepage, and the password-gated `/admin/leads` viewer.

## Workspace placement

Lives under `artifacts/dayli-website/` in the pnpm monorepo.
Backed by `artifacts/api-server/` for `/api/*` calls and `lib/db/` for
Postgres persistence via Drizzle.

## Running locally

```bash
pnpm --filter @workspace/dayli-website run dev
```

The workflow `artifacts/dayli-website: web` is configured to do this for you
in the Replit environment.

## Environment variables

This artifact uses Vite, so any variable it reads in the browser must be
prefixed with `VITE_`. They are exposed in `import.meta.env`. None are
strictly required for the site to load, but several toggle key flows.

### Used directly by the website

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | yes | Port the dev/preview server binds to. Provided by the platform. |
| `BASE_PATH` | yes | Path prefix the site is served under (e.g. `/` or `/dayli-website`). Provided by the platform. |
| `VITE_API_BASE` | no | Override the base URL for `/api/*` calls. Defaults to a same-origin path computed by `apiUrl()` so production and local dev both work without setting this. Set when pointing the website at a remote API. |
| `VITE_WHATSAPP_NUMBER` | no | International WhatsApp number (digits only, no `+`) used to build `https://wa.me/<number>` links. **When empty, every WhatsApp CTA renders disabled with the localized "setup in progress" microcopy.** Set this once the WhatsApp Business API is provisioned to enable all CTAs. |

### Used by the API server (`artifacts/api-server`) the website talks to

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string for lead persistence and chat-turn logs. |
| `LEADS_ADMIN_PASSWORD` | yes (for `/admin/leads`) | HTTP Basic Auth password gating `/api/admin/leads`. Username is fixed to `admin`. |
| `SESSION_SECRET` | yes | Secret used by the API for signed session cookies. |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | yes (for `/api/chat`) | Provided by the Replit OpenAI AI integration. The chat route lazy-loads the OpenAI client on first request, so the rest of the API still serves if this is missing — only `/api/chat` returns 503. |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | yes (for `/api/chat`) | Provided by the Replit OpenAI AI integration. |

### Used by the WhatsApp Business API integration (all five required to enable)

The `/api/whatsapp/webhook` endpoint and outbound replies are
**feature-flagged** on the five secrets below being set together. With
any one missing, the webhook returns 503 and the rest of the site keeps
working unchanged. See `docs/whatsapp-setup.md` for the founder runbook
on how to obtain each value from Meta.

| Variable | Required | Purpose |
| --- | --- | --- |
| `META_WHATSAPP_TOKEN` | yes (for WhatsApp) | Permanent system-user access token. |
| `META_WHATSAPP_PHONE_NUMBER_ID` | yes (for WhatsApp) | Numeric ID of the claimed phone number (NOT the dialable number). |
| `META_WHATSAPP_VERIFY_TOKEN` | yes (for WhatsApp) | Random string you choose; Meta echoes it during the webhook handshake. |
| `META_WHATSAPP_APP_SECRET` | yes (for WhatsApp) | Used to verify every inbound webhook POST via HMAC-SHA256. |
| `META_WHATSAPP_HASH_SALT` | yes (for WhatsApp) | Random salt used to hash user phone numbers before persistence. |
| `META_WHATSAPP_GRAPH_VERSION` | no | Pinned Graph API version. Defaults to `v23.0`. |
| `META_WHATSAPP_ONBOARDING_TEMPLATE` | no | Approved Meta template name for first-touch outbound. Defaults to `dayli_onboarding_v1`. |
| `META_WHATSAPP_ONBOARDING_LANGUAGE` | no | Locale for the onboarding template. Defaults to `en`. |

## Routes

- `/` — homepage (hero with chat demo, conditions snapshot, value props).
- `/clinics` — clinic lead-capture funnel.
- `/pharma` — pharma lead-capture funnel.
- `/product` — product overview.
- `/admin/leads` — password-gated lead viewer with CSV export.
  - Hidden from search engines via both a client-side `<meta name="robots">`
    tag and a server-side `X-Robots-Tag: noindex, nofollow` response header
    (Vite plugin in `vite.config.ts`).

Locales: `en`, `hi`, `te`, `ar`. Selectable from the layout language switcher.

## Build & SEO checks

```bash
pnpm --filter @workspace/dayli-website run build
```

The build runs `verify-prerendered-seo.mjs` which checks `<title>`, meta
description, hreflang, canonical, and OG tags on every page in `PAGE_ROUTES`.
`/admin/leads` is intentionally excluded from `PAGE_ROUTES` (it is a
client-only, noindexed surface).
