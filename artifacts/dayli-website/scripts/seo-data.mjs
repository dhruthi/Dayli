// Plain-JS SEO sidecar consumed by scripts/prerender.mjs at build time.
//
// Per-locale SEO copy AND the JSON-LD / page-base-path / org-identity
// surface area are imported from src/lib/* so the runtime React app
// (src/lib/seo.ts) and this build-time prerender share a single source
// of truth. Editing translations.ts or seo-shared.ts updates both the
// live <head> and the prerendered HTML. Node 24+ supports importing .ts
// modules natively via type-stripping; if any import ever fails the
// build dies loudly here instead of silently shipping stale strings.

import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LIB_DIR = path.resolve(__dirname, "..", "src", "lib");
const TRANSLATIONS_PATH = path.join(LIB_DIR, "translations.ts");
const I18N_PATH = path.join(LIB_DIR, "i18n.ts");
const SEO_SHARED_PATH = path.join(LIB_DIR, "seo-shared.ts");

let TRANSLATIONS;
let I18N;
let SHARED;
try {
  ({ TRANSLATIONS } = await import(pathToFileURL(TRANSLATIONS_PATH).href));
  I18N = await import(pathToFileURL(I18N_PATH).href);
  SHARED = await import(pathToFileURL(SEO_SHARED_PATH).href);
} catch (err) {
  throw new Error(
    `[seo-data] Failed to import shared SEO modules from ${LIB_DIR}. ` +
      `Node 24+ is required for native .ts imports. Original error: ${err?.message ?? err}`,
  );
}

const { LOCALES, LOCALE_META, DEFAULT_LOCALE, localizedPath } = I18N;
const { PAGE_BASE_PATHS, INDEXED_PAGE_KEYS, buildAlternates, buildJsonLdFor } = SHARED;

export const SITE_URL =
  (process.env.VITE_SITE_URL || process.env.SITE_URL || "https://dayli.ai").replace(/\/$/, "");

export const DEFAULT_OG_IMAGE = `${SITE_URL}/opengraph.png`;

export { LOCALES, LOCALE_META, DEFAULT_LOCALE };

// Validate per-locale per-page seoTitle/seoDescription up front so a missing
// key fails the build instead of producing an empty <title>.
function buildTitleDesc() {
  const out = {};
  for (const locale of LOCALES) {
    const tr = TRANSLATIONS?.[locale];
    if (!tr) {
      throw new Error(`[seo-data] TRANSLATIONS missing locale "${locale}"`);
    }
    out[locale] = {};
    for (const pageKey of INDEXED_PAGE_KEYS) {
      const page = tr[pageKey];
      const t = page?.seoTitle;
      const d = page?.seoDescription;
      if (typeof t !== "string" || !t.trim() || typeof d !== "string" || !d.trim()) {
        throw new Error(
          `[seo-data] Missing seoTitle/seoDescription for locale="${locale}" page="${pageKey}" in translations.ts`,
        );
      }
      out[locale][pageKey] = { t, d };
    }
  }
  return out;
}

const TITLE_DESC = buildTitleDesc();
const SEO_CTX = { siteUrl: SITE_URL, defaultOgImage: DEFAULT_OG_IMAGE };

export const PAGES = [];
for (const locale of LOCALES) {
  const meta = LOCALE_META[locale];
  for (const pageKey of INDEXED_PAGE_KEYS) {
    const basePath = PAGE_BASE_PATHS[pageKey];
    const localized = localizedPath(locale, basePath);
    const td = TITLE_DESC[locale][pageKey];
    PAGES.push({
      pageKey,
      locale,
      htmlLang: meta.htmlLang,
      dir: meta.dir,
      basePath,
      path: localized,
      title: td.t,
      description: td.d,
      jsonLd: buildJsonLdFor(pageKey, locale, SEO_CTX),
      alternates: buildAlternates(SITE_URL, basePath),
    });
  }
}

// 404 page: pull from TRANSLATIONS too so even the not-found copy stays
// in lockstep with the React app's notFound page.
const notFoundEn = TRANSLATIONS?.[DEFAULT_LOCALE]?.notFound;
if (
  !notFoundEn ||
  typeof notFoundEn.seoTitle !== "string" ||
  !notFoundEn.seoTitle.trim() ||
  typeof notFoundEn.seoDescription !== "string" ||
  !notFoundEn.seoDescription.trim()
) {
  throw new Error(
    `[seo-data] Missing notFound.seoTitle/seoDescription for default locale "${DEFAULT_LOCALE}" in translations.ts`,
  );
}
PAGES.push({
  pageKey: "notFound",
  locale: DEFAULT_LOCALE,
  htmlLang: LOCALE_META[DEFAULT_LOCALE].htmlLang,
  dir: LOCALE_META[DEFAULT_LOCALE].dir,
  basePath: PAGE_BASE_PATHS.notFound,
  path: PAGE_BASE_PATHS.notFound,
  title: notFoundEn.seoTitle,
  description: notFoundEn.seoDescription,
  noindex: true,
  alternates: undefined,
  jsonLd: undefined,
});

export default { SITE_URL, DEFAULT_OG_IMAGE, PAGES, LOCALES, LOCALE_META, DEFAULT_LOCALE };
