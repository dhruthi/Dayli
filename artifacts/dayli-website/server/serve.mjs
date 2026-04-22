#!/usr/bin/env node
/**
 * Production HTTP server for the prerendered dayli.ai static site.
 *
 * Why this exists (vs. plain static hosting):
 *
 *   The auto-detect language banner in the React app only runs after the
 *   browser has loaded the English HTML — which means a Google result for a
 *   Hindi/Telugu/Arabic query still lands the visitor on /index.html first,
 *   and search engines are only ever shown the English variant of every URL.
 *
 *   This server adds a small server-side hint:
 *
 *     1. On every response for a canonical (un-prefixed) HTML page, it sets
 *        `Vary: Accept-Language, Cookie` so that any downstream cache (CDN,
 *        browser) knows responses can legitimately differ per visitor.
 *
 *     2. For first-time human visitors (no `dayli_locale_pref` cookie, not a
 *        bot) whose Accept-Language header indicates they prefer a supported
 *        non-English locale, it issues a 302 redirect to the matching
 *        `/<locale>/...` URL. The 302 (temporary) is deliberate: English is
 *        still the canonical page, so search engines don't replace the
 *        canonical with the redirect target.
 *
 *     3. Bots, link unfurlers, and visitors with an existing preference
 *        cookie are served the originally-requested HTML untouched. That
 *        keeps Googlebot's view consistent with the canonical link tag and
 *        respects an explicit user choice from the in-page language switcher.
 *
 * Everything else (assets, sitemap.xml, robots.txt, /404.html fallback) is
 * served straight from dist/public.
 */

import { promises as fs } from "node:fs";
import { createReadStream, statSync, existsSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATIC_ROOT = path.resolve(__dirname, "..", "dist", "public");

const PORT = Number(process.env.PORT);
if (!PORT || Number.isNaN(PORT)) {
  throw new Error("PORT environment variable is required");
}

const LOCALES = ["en", "hi", "te", "ar"];
const DEFAULT_LOCALE = "en";
const LOCALE_PREF_COOKIE = "dayli_locale_pref";

// Mirror of src/lib/i18n.ts — kept here as a tiny standalone copy so the
// server has zero TS/build deps. If you add a locale, update both places
// (and translations.ts, and seo-data.mjs).
const BOT_UA_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|preview|outbrain|pinterest|whatsapp|telegram|lighthouse|headlesschrome|prerender/i;

function isLikelyBot(ua) {
  if (!ua) return false;
  return BOT_UA_RE.test(ua);
}

function isLocale(value) {
  return LOCALES.includes(value);
}

function parseLocaleFromPath(pathname) {
  const clean = pathname.replace(/\/+$/g, "") || "/";
  const segments = clean.split("/").filter(Boolean);
  if (segments.length > 0 && isLocale(segments[0])) {
    return { locale: segments[0], basePath: "/" + segments.slice(1).join("/") };
  }
  return { locale: DEFAULT_LOCALE, basePath: clean === "" ? "/" : clean };
}

function localizedPath(locale, basePath) {
  const base = basePath.startsWith("/") ? basePath : `/${basePath}`;
  if (locale === DEFAULT_LOCALE) return base;
  if (base === "/") return `/${locale}`;
  return `/${locale}${base}`;
}

/**
 * Parse an Accept-Language header into an ordered list of primary language
 * tags, sorted by descending q-value. "hi-IN,hi;q=0.9,en;q=0.8" → ["hi-IN", "hi", "en"].
 */
function parseAcceptLanguage(header) {
  if (!header) return [];
  return header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      let q = 1.0;
      for (const p of params) {
        const [k, v] = p.trim().split("=");
        if (k === "q") {
          const parsed = parseFloat(v);
          if (!Number.isNaN(parsed)) q = parsed;
        }
      }
      return { tag: (tag || "").trim(), q };
    })
    .filter((x) => x.tag)
    .sort((a, b) => b.q - a.q)
    .map((x) => x.tag);
}

/**
 * Mirror of pickPreferredLocale() in src/lib/i18n.ts. Returns the first
 * supported non-default locale in the visitor's preference list, or null if
 * the visitor's top preference is English / no supported match exists.
 */
function pickPreferredLocale(tags) {
  for (const tag of tags) {
    if (!tag) continue;
    const primary = tag.toLowerCase().split("-")[0];
    if (primary === DEFAULT_LOCALE) return null;
    if (isLocale(primary)) return primary;
  }
  return null;
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (!k) continue;
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      // Malformed cookie values must not crash the request — fall back to
      // the raw value so the rest of the server still runs.
      out[k] = v;
    }
  }
  return out;
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".map": "application/json",
};

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

/**
 * Resolve a URL pathname to a real file inside dist/public.
 *
 * Returns { filePath, isHtml } or null if no match. Supports:
 *  - exact files (/favicon.svg → /favicon.svg)
 *  - directory index (/product/ → /product/index.html, /product → /product/index.html)
 *  - root (/ → /index.html)
 */
function resolveFile(urlPath) {
  // Strip query string (already stripped by URL parsing) and prevent traversal.
  const safe = path.posix.normalize(urlPath).replace(/^(\.\.(\/|$))+/, "");
  const abs = path.join(STATIC_ROOT, safe);
  if (!abs.startsWith(STATIC_ROOT)) return null;

  if (existsSync(abs)) {
    const stat = statSync(abs);
    if (stat.isFile()) {
      return { filePath: abs, isHtml: abs.endsWith(".html") };
    }
    if (stat.isDirectory()) {
      const idx = path.join(abs, "index.html");
      if (existsSync(idx) && statSync(idx).isFile()) {
        return { filePath: idx, isHtml: true };
      }
    }
  }

  // Try treating the URL as a directory ("/product" → "/product/index.html")
  const idx = path.join(abs, "index.html");
  if (existsSync(idx) && statSync(idx).isFile()) {
    return { filePath: idx, isHtml: true };
  }

  return null;
}

async function send404Async(res) {
  const fallback = path.join(STATIC_ROOT, "404.html");
  try {
    const body = await fs.readFile(fallback);
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  }
}

function streamFile(res, filePath, extraHeaders = {}, method = "GET") {
  const headers = { "content-type": contentTypeFor(filePath), ...extraHeaders };
  // For HEAD, send headers only — RFC 9110 forbids a response body.
  if (method === "HEAD") {
    try {
      headers["content-length"] = String(statSync(filePath).size);
    } catch {
      /* if stat fails the headers are still valid; just skip Content-Length */
    }
    res.writeHead(200, headers);
    res.end();
    return;
  }
  res.writeHead(200, headers);
  createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { allow: "GET, HEAD" });
      res.end("Method Not Allowed");
      return;
    }

    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname || "/";

    const { locale: urlLocale, basePath } = parseLocaleFromPath(pathname);
    const cookies = parseCookies(req.headers.cookie);
    const hasPref = Boolean(cookies[LOCALE_PREF_COOKIE]);
    const ua = req.headers["user-agent"];

    // Server-side language hint: only consider redirecting when the visitor
    // is on the canonical (English) variant of a real page, has not yet
    // expressed a preference, and is not a bot/unfurler.
    const isCanonicalEnglish = urlLocale === DEFAULT_LOCALE;
    const resolved = resolveFile(pathname);
    const isHtml = !!resolved?.isHtml;

    if (
      isHtml &&
      isCanonicalEnglish &&
      !hasPref &&
      !isLikelyBot(ua) &&
      // Don't redirect the 404 page itself.
      basePath !== "/404"
    ) {
      const tags = parseAcceptLanguage(req.headers["accept-language"]);
      const preferred = pickPreferredLocale(tags);
      if (preferred) {
        const target = localizedPath(preferred, basePath) + (url.search || "");
        res.writeHead(302, {
          location: target,
          // Tell caches this redirect varies by both the language header and
          // the override cookie so they don't serve a cached redirect to a
          // visitor who has since chosen a different language.
          vary: "Accept-Language, Cookie",
          "cache-control": "private, no-cache",
        });
        res.end();
        return;
      }
    }

    if (!resolved) {
      await send404Async(res);
      return;
    }

    const headers = {};
    if (resolved.isHtml) {
      // HTML pages must always advertise Vary so a CDN / browser cache does
      // not serve one visitor's localized response to another visitor with a
      // different Accept-Language. This applies to every HTML route, not
      // just the redirect path, so localized variants are also cache-safe.
      headers["vary"] = "Accept-Language, Cookie";
      headers["cache-control"] = "public, max-age=0, must-revalidate";
    } else {
      // Static assets are content-hashed by Vite — safe to cache aggressively.
      const isAsset = resolved.filePath.includes(`${path.sep}assets${path.sep}`);
      headers["cache-control"] = isAsset
        ? "public, max-age=31536000, immutable"
        : "public, max-age=3600";
    }

    streamFile(res, resolved.filePath, headers, req.method);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[serve] request failed:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    }
    res.end("Internal Server Error");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`[serve] dayli.ai static site listening on :${PORT}`);
});
