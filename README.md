# Dayli

Dayli is a climate-aware health companion for women and children. This
repository contains its multilingual website, interactive chat demo,
clinic and pharma enquiry forms, and WhatsApp automation service.

Health guidance is educational and is not a substitute for medical care.

## Architecture

- `artifacts/dayli-website`: React, Vite, and Tailwind website with English,
  Hindi, Telugu, and Arabic pages, plus prerendered SEO content.
- `artifacts/api-server`: Express API for chat, local conditions, enquiries,
  and WhatsApp webhooks.
- `lib/api-spec`: OpenAPI contracts and client generation.
- `lib/api-client-react` and `lib/api-zod`: generated client and validation.
- `lib/db`: PostgreSQL schema managed with Drizzle.
- `artifacts/mockup-sandbox`: development-only component previews.

## Requirements

Use Node.js 24 and pnpm. The dependency overrides currently target Linux
x64; use that platform for reproducible installs and builds.

```sh
pnpm install --frozen-lockfile
```

## Development

For a website-only preview:

```sh
PORT=4173 BASE_PATH=/ pnpm --filter @workspace/dayli-website run dev
```

API-backed features also need the API service and PostgreSQL:

```sh
PORT=8080 pnpm --filter @workspace/api-server run dev
```

Provide secrets through the process environment, not committed files.
Configure the database connection before starting the API. A full-stack
host must route `/api/*` to the API service and other routes to the website
on the same origin. A website-only preview does not provide chat or form
submission services.

See [website configuration](artifacts/dayli-website/README.md) and the
[WhatsApp runbook](docs/whatsapp-setup.md) for environment requirements.
The public WhatsApp link works independently of automated webhook replies.

## Checks and builds

```sh
pnpm run typecheck
pnpm --filter @workspace/dayli-website run test:e2e:install
pnpm --filter @workspace/dayli-website run test:e2e
PORT=4173 BASE_PATH=/ pnpm --filter @workspace/dayli-website run build
pnpm --filter @workspace/api-server run build
```

Browser tests can start their own website server. Website builds include
prerendering and SEO checks. After changing the API contract, regenerate
clients with `pnpm --filter @workspace/api-spec run codegen`.

Database schema changes require deliberate review; never apply development
schema commands to a production database without a migration plan.

## Hosting and repository scope

Deployment configuration and actual dependency names are retained because
they describe how the project runs. Internal agent notes and unused source
uploads are excluded from release snapshots; application images remain in
the website's asset directories.

Existing Git history is preserved. A release update should be prepared on
a branch based on GitHub `main`, reviewed, and submitted as a pull request
without importing unrelated local checkpoint commits.