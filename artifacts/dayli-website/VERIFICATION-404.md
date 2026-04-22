# 404 verification report

Date: 2026-04-22
Environment: task-agent isolated container (cannot publish to production)

## Goal
Confirm that unknown URLs on the deployed site return HTTP 404 with our
prerendered NotFound page (containing the "Page not found" copy and a
`noindex` robots meta), and that known routes still return 200 with their
prerendered HTML.

## Build output (verified)
`PORT=22304 BASE_PATH=/ pnpm --filter @workspace/dayli-website build`
produces, in `dist/public/`:

- `404.html` (9.3 KB) — `<title>Page not found — dayli.ai</title>` and
  `<meta name="robots" content="noindex, nofollow" />`, plus the full
  prerendered NotFound body.
- One file per known route (`index.html`, plus `<route>.html` and
  `<route>/index.html` for `/product`, `/clinics`, `/pharma`, `/about`,
  `/privacy`), each with a distinct correct `<title>`.

`.replit-artifact/artifact.toml` has no `rewrites` block, so the static host
is expected to fall through to `/404.html` for unknown paths.

## Static-host behavior (verified locally against nginx)
Replit's static deployments are served by nginx (the live site's `Server`
header is `nginx/1.28.2`). To produce concrete verification of the prerender
+ 404 behavior — which cannot be exercised against the real production host
from a task-agent container — I served `dist/public` with a local nginx
(1.20.1) configured the way a static deploy would handle requests:

```nginx
location / {
    try_files $uri $uri/index.html $uri.html =404;
}
error_page 404 /404.html;
```

Results:

| URL                          | HTTP | Body (`<title>`)                                                              |
| ---------------------------- | ---- | ----------------------------------------------------------------------------- |
| `/`                          | 200  | `dayli.ai — AI Climate Health Copilot for Women & Children`                   |
| `/product`                   | 200  | `How dayli Works — Climate, Health & AI on WhatsApp \| dayli.ai`              |
| `/clinics`                   | 200  | `dayli for Clinics — Reduce No-Shows, Improve Outcomes \| dayli.ai`           |
| `/pharma`                    | 200  | `dayli for Pharma — Climate-Aware Adherence \| dayli.ai`                      |
| `/about`                     | 200  | `About dayli — A Daily Decision Layer for Health \| dayli.ai`                 |
| `/privacy`                   | 200  | `Privacy at dayli — Your Data, Your Control \| dayli.ai`                      |
| `/this-route-does-not-exist` | 404  | `Page not found — dayli.ai` (with `noindex, nofollow` robots meta)            |
| `/nonexistent-xyz-test-123`  | 404  | `Page not found — dayli.ai` (with `noindex, nofollow` robots meta)            |
| `/foo/bar/baz`               | 404  | `Page not found — dayli.ai` (with `noindex, nofollow` robots meta)            |

All "Done looks like" criteria pass against this nginx config.

## Caveat: depends on the host wiring `error_page`
I also tested an nginx config WITHOUT `error_page 404 /404.html;` (only
`try_files ... =404;`). In that variant, unknown URLs return:

```
HTTP/1.1 404 Not Found
<html>
<head><title>404 Not Found</title></head>
<body><center><h1>404 Not Found</h1></center>
<hr><center>nginx/1.20.1</center></body></html>
```

i.e. the correct status, but the unbranded default nginx page — not our
`/404.html`. So the prerendered branded 404 is only served if the upstream
static host either (a) auto-maps `error_page 404 /404.html;` for static
deploys (Netlify, Vercel, GitHub Pages and most static hosts do this by
default when a `404.html` is present at the publish root), or (b) we add an
explicit equivalent in `artifact.toml`.

## Production: cannot be verified from this environment
The live `https://dayli.ai/` is currently serving an unrelated stale static
site ("Dayli Health | Nurturing Tomorrow, Today") — not this React/Vite
build. Every probed URL returns the identical HTTP 200 (etag
`69bfb226-4fec`, last-modified `2026-03-22`, body references
`./css/index.css` instead of `/assets/index-*.js`). The new prerender + 404
work has never been deployed to `dayli.ai`.

A task-agent container cannot publish (`suggestDeploy()` is gated to the
main repl) and cannot reroute the custom domain, so live verification has
to happen after the user republishes the site.

## Re-verification commands (run after redeploy from main)
```sh
# Should be 404 + our NotFound HTML
curl -sI https://dayli.ai/this-route-does-not-exist
curl -s  https://dayli.ai/this-route-does-not-exist | grep -E "Page not found|noindex"

# Should each be 200 with their own <title>
for p in / /product /clinics /pharma /about /privacy; do
  printf '%s -> ' "$p"
  curl -s -o /dev/null -w "%{http_code}\n" "https://dayli.ai$p"
done
```

If unknown URLs come back as 200, an old SPA rewrite is still active on the
host (re-check that `[services.production].rewrites` is absent in
`.replit-artifact/artifact.toml`). If they come back 404 but with the
unbranded nginx default page, the host did not auto-map `/404.html`; in
that case add an explicit error-document mapping (the documented
`rewrites` schema does not expose a status field, so this likely needs a
platform support request or a different deployment target — record the
finding and escalate).
