# 404 verification report

Last updated: 2026-04-22 (re-verification pass)
Environment: task-agent isolated container (cannot publish to production)

## Goal
Confirm that unknown URLs on the deployed site return HTTP 404 with our
prerendered NotFound page (containing the "Page not found" copy and a
`noindex` robots meta), and that known routes still return 200 with their
prerendered HTML.

## Regression found and fixed in this pass
When the prerender was extended to emit per-locale routes (`/hi`, `/te`,
`/ar` and their subpages), the `/404` entry was dropped from the `PAGES`
list in `scripts/seo-data.mjs`. As a result, recent builds produced
`dist/public/` *without a `404.html`*. Even after the site is republished,
unknown URLs would hit the static host's default 404 page (or a SPA
fallback) instead of our branded NotFound.

The regression is fixed in this commit: `scripts/seo-data.mjs` now appends
a single `/404` page entry (English, `noindex: true`, no hreflang
alternates), and `pnpm --filter @workspace/dayli-website build` once again
writes `dist/public/404.html` (~10 KB) with:

- `<title>Page not found — dayli.ai</title>`
- `<meta name="robots" content="noindex, nofollow" />`
- The full prerendered NotFound body ("Page not found" copy)

## Build output (verified locally in this pass)
After `PORT=22304 BASE_PATH=/ pnpm --filter @workspace/dayli-website build`,
`dist/public/` contains:

- `404.html` (re-added by this fix).
- One file per known route: `index.html`, plus `<route>.html` and
  `<route>/index.html` equivalents for `/product`, `/clinics`, `/pharma`,
  `/about`, `/privacy`, and the localized `/hi/*`, `/te/*`, `/ar/*`
  variants.

`.replit-artifact/artifact.toml` has no `rewrites` block, so the static
host is expected to fall through to `/404.html` for unknown paths.

## Static-host behavior (verified locally against nginx in the prior pass)
Replit's static deployments are served by Google Frontend in production
(`server: Google Frontend`). Locally, served via nginx with:

```nginx
location / {
    try_files $uri $uri/index.html $uri.html =404;
}
error_page 404 /404.html;
```

…known routes returned 200 with their distinct `<title>`s, and unknown
routes returned `404` with our branded `Page not found` body and the
`noindex, nofollow` robots meta. Without `error_page 404 /404.html;`,
nginx returned a correct 404 status but served its unbranded default
page — i.e. the branded 404 only appears when the host auto-maps
`/404.html` (which most static hosts, including Replit's, do by default
when a `404.html` is present at the publish root).

## Production: still cannot be verified from this environment
As of this writing, `https://dayli.ai/` is still serving the same stale
unrelated static site ("Dayli Health | Nurturing Tomorrow, Today") that
was present before. Every probed URL returns the identical HTTP 200 with
`last-modified: 2026-03-22` (or a same-day cache fill of that body) and
references `./css/index.css` instead of our `/assets/index-*.js`. The
React/Vite build with the prerender + 404 fix has never been deployed to
`dayli.ai`.

A task-agent container cannot publish (deploy is gated to the main
workspace) and cannot reroute the custom domain, so live verification has
to happen *after* the user republishes the site from the main workspace.

## Re-verification commands (run after redeploy from main)
```sh
# Should be 404 + our NotFound HTML
curl -sI https://dayli.ai/this-route-does-not-exist
curl -s  https://dayli.ai/this-route-does-not-exist | grep -E "Page not found|noindex"

# Should each be 200 with their own <title>
for p in / /product /clinics /pharma /about /privacy /hi /te /ar; do
  printf '%s -> ' "$p"
  curl -s -o /dev/null -w "%{http_code}\n" "https://dayli.ai$p"
done
```

If unknown URLs come back as 200, an old SPA rewrite is still active on
the host (re-check that `[services.production].rewrites` is absent in
`.replit-artifact/artifact.toml`). If they come back 404 but with an
unbranded host default page, the static host did not auto-map
`/404.html`; in that case an explicit error-document mapping is needed,
but the documented `rewrites` schema does not expose a status field, so
this likely requires platform support — record the finding and escalate.
