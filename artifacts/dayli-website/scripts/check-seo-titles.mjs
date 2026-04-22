#!/usr/bin/env node
// Build-time guard: every locale in LOCALES must have a non-empty
// seoTitle and seoDescription for every page key consumed by the runtime
// (src/lib/seo.ts) and the prerender (scripts/seo-data.mjs). If anyone
// adds a new page or locale and forgets the copy, this script fails the
// build with a clear, aggregated error instead of silently shipping
// undefined <title> / meta description.

import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TRANSLATIONS_PATH = path.resolve(__dirname, "..", "src", "lib", "translations.ts");
const SEO_TS_PATH = path.resolve(__dirname, "..", "src", "lib", "seo.ts");
const SEO_SHARED_PATH = path.resolve(__dirname, "..", "src", "lib", "seo-shared.ts");
const I18N_TS_PATH = path.resolve(__dirname, "..", "src", "lib", "i18n.ts");
const SEO_DATA_PATH = path.resolve(__dirname, "seo-data.mjs");

let TRANSLATIONS;
try {
  ({ TRANSLATIONS } = await import(pathToFileURL(TRANSLATIONS_PATH).href));
} catch (err) {
  console.error(
    `[check-seo-titles] Failed to import TRANSLATIONS from ${TRANSLATIONS_PATH}. ` +
      `Node 24+ is required for native .ts imports. Original error: ${err?.message ?? err}`,
  );
  process.exit(1);
}

let LOCALES;
let INDEXED_PAGE_KEYS;
try {
  ({ LOCALES } = await import(pathToFileURL(SEO_DATA_PATH).href));
  ({ INDEXED_PAGE_KEYS } = await import(pathToFileURL(SEO_SHARED_PATH).href));
} catch (err) {
  console.error(
    `[check-seo-titles] Failed to import LOCALES from ${SEO_DATA_PATH} or ` +
      `INDEXED_PAGE_KEYS from ${SEO_SHARED_PATH}. ` +
      `Original error: ${err?.message ?? err}`,
  );
  process.exit(1);
}
const PAGE_KEYS = INDEXED_PAGE_KEYS;

// Discover the full PageKey union from the runtime source by reading
// the file. This keeps the check honest if a new page key is added to
// the runtime but PAGE_KEYS in seo-data.mjs is forgotten. PageKey moved
// from seo.ts to seo-shared.ts; we look in both for resilience.
let runtimePageKeys;
{
  const fs = await import("node:fs/promises");
  const candidates = [SEO_SHARED_PATH, SEO_TS_PATH];
  let lastErr;
  for (const p of candidates) {
    try {
      const src = await fs.readFile(p, "utf8");
      const match = src.match(/export type PageKey\s*=([\s\S]*?);/);
      if (!match) {
        lastErr = new Error(`Could not find \`export type PageKey = ...;\` in ${p}`);
        continue;
      }
      const keys = Array.from(match[1].matchAll(/"([^"]+)"/g)).map((m) => m[1]);
      if (keys.length === 0) {
        lastErr = new Error(`Parsed PageKey union from ${p} but found zero keys`);
        continue;
      }
      runtimePageKeys = keys;
      break;
    } catch (err) {
      lastErr = err;
    }
  }
  if (!runtimePageKeys) {
    console.error(
      `[check-seo-titles] Failed to extract PageKey from runtime source: ${lastErr?.message ?? lastErr}`,
    );
    process.exit(1);
  }
}

const errors = [];

// 0) LOCALES in scripts/seo-data.mjs (drives the prerender) must match
//    LOCALES in src/lib/i18n.ts (drives the runtime). Otherwise a locale
//    can be added to the runtime but never prerendered, or vice versa.
let runtimeLocales;
try {
  const fs = await import("node:fs/promises");
  const src = await fs.readFile(I18N_TS_PATH, "utf8");
  const match = src.match(/export const LOCALES\s*=\s*\[([^\]]*)\]/);
  if (!match) {
    throw new Error("Could not find `export const LOCALES = [...]` in i18n.ts");
  }
  runtimeLocales = Array.from(match[1].matchAll(/"([^"]+)"/g)).map((m) => m[1]);
  if (runtimeLocales.length === 0) {
    throw new Error("Parsed LOCALES from i18n.ts but found zero entries");
  }
} catch (err) {
  console.error(
    `[check-seo-titles] Failed to extract LOCALES from ${I18N_TS_PATH}: ${err?.message ?? err}`,
  );
  process.exit(1);
}
for (const loc of runtimeLocales) {
  if (!LOCALES.includes(loc)) {
    errors.push(
      `seo-data.mjs LOCALES is missing "${loc}" (declared in i18n.ts LOCALES).`,
    );
  }
}
for (const loc of LOCALES) {
  if (!runtimeLocales.includes(loc)) {
    errors.push(
      `seo-data.mjs LOCALES contains "${loc}" which is not in i18n.ts LOCALES.`,
    );
  }
}

// 1) Every runtime PageKey (except notFound, which has its own basePath
//    handling) must be listed in INDEXED_PAGE_KEYS so the prerender emits it.
const expectedPrerenderKeys = runtimePageKeys.filter((k) => k !== "notFound");
for (const key of expectedPrerenderKeys) {
  if (!PAGE_KEYS.includes(key)) {
    errors.push(
      `seo-shared.ts INDEXED_PAGE_KEYS is missing "${key}" (declared in PageKey union).`,
    );
  }
}
for (const key of PAGE_KEYS) {
  if (!runtimePageKeys.includes(key)) {
    errors.push(
      `seo-shared.ts INDEXED_PAGE_KEYS contains "${key}" which is not in the PageKey union.`,
    );
  }
}

// 2) Every locale must have non-empty seoTitle + seoDescription for
//    every PageKey (including notFound, which seo.ts reads per-locale).
for (const locale of LOCALES) {
  const tr = TRANSLATIONS?.[locale];
  if (!tr) {
    errors.push(`TRANSLATIONS is missing locale "${locale}".`);
    continue;
  }
  for (const key of runtimePageKeys) {
    const page = tr[key];
    if (!page || typeof page !== "object") {
      errors.push(`TRANSLATIONS["${locale}"]["${key}"] is missing.`);
      continue;
    }
    const t = page.seoTitle;
    const d = page.seoDescription;
    if (typeof t !== "string" || !t.trim()) {
      errors.push(
        `TRANSLATIONS["${locale}"]["${key}"].seoTitle is missing or empty.`,
      );
    }
    if (typeof d !== "string" || !d.trim()) {
      errors.push(
        `TRANSLATIONS["${locale}"]["${key}"].seoDescription is missing or empty.`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error("\n[check-seo-titles] SEO title/description coverage failed:\n");
  for (const e of errors) console.error(`  - ${e}`);
  console.error(
    `\nFix the entries above in src/lib/translations.ts (or update PAGE_KEYS ` +
      `in scripts/seo-data.mjs) and re-run the build.\n`,
  );
  process.exit(1);
}

const totalChecks = LOCALES.length * runtimePageKeys.length;
console.log(
  `[check-seo-titles] OK — ${totalChecks} (locale × page) SEO title+description entries verified ` +
    `across ${LOCALES.length} locale(s) and ${runtimePageKeys.length} page key(s).`,
);
