// Plain-JS SEO sidecar consumed by scripts/prerender.mjs at build time.
//
// Per-locale SEO titles and descriptions are read directly from
// src/lib/translations.ts (the single source of truth used by the React app
// at runtime). Node 24+ supports importing .ts modules natively via
// type-stripping, so this file does NOT duplicate copy — any edit in
// translations.ts flows straight through to prerendered <title> / meta
// description / OG / Twitter / JSON-LD output. If the import ever fails
// (e.g. because translations.ts grows a non-stripable TS feature), the
// build fails loudly here instead of silently shipping stale strings.

import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TRANSLATIONS_PATH = path.resolve(__dirname, "..", "src", "lib", "translations.ts");

let TRANSLATIONS;
try {
  ({ TRANSLATIONS } = await import(pathToFileURL(TRANSLATIONS_PATH).href));
} catch (err) {
  throw new Error(
    `[seo-data] Failed to import per-locale translations from ${TRANSLATIONS_PATH}. ` +
      `Node 24+ is required for native .ts imports. Original error: ${err?.message ?? err}`,
  );
}

export const SITE_URL =
  (process.env.VITE_SITE_URL || process.env.SITE_URL || "https://dayli.ai").replace(/\/$/, "");

export const DEFAULT_OG_IMAGE = `${SITE_URL}/opengraph.png`;

export const LOCALES = ["en", "hi", "te", "ar"];
export const DEFAULT_LOCALE = "en";

export const LOCALE_META = {
  en: { htmlLang: "en", hreflang: "en", dir: "ltr" },
  hi: { htmlLang: "hi", hreflang: "hi-IN", dir: "ltr" },
  te: { htmlLang: "te", hreflang: "te-IN", dir: "ltr" },
  ar: { htmlLang: "ar", hreflang: "ar", dir: "rtl" },
};

export function localizedPath(locale, basePath) {
  const base = basePath.startsWith("/") ? basePath : `/${basePath}`;
  if (locale === DEFAULT_LOCALE) return base;
  if (base === "/") return `/${locale}`;
  return `/${locale}${base}`;
}

export const PAGE_KEYS = ["home", "product", "clinics", "pharma", "about", "privacy"];
const PAGE_BASE_PATH = {
  home: "/", product: "/product", clinics: "/clinics", pharma: "/pharma", about: "/about", privacy: "/privacy",
};

// Derive { t, d } per locale per page from TRANSLATIONS so the strings can
// only live in one place. Validates presence so a missing key fails the
// build instead of producing an empty <title>.
function buildTitleDesc() {
  const out = {};
  for (const locale of LOCALES) {
    const tr = TRANSLATIONS?.[locale];
    if (!tr) {
      throw new Error(`[seo-data] TRANSLATIONS missing locale "${locale}"`);
    }
    out[locale] = {};
    for (const pageKey of PAGE_KEYS) {
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

const ORG = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "dayli.ai",
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.svg`,
  description: "dayli is an AI-powered Climate Health Copilot for women and children, delivering real-time personalized guidance on WhatsApp.",
  sameAs: [],
};

const WEBSITE = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: "dayli.ai",
  publisher: { "@id": `${SITE_URL}/#organization` },
  inLanguage: LOCALES.map((l) => LOCALE_META[l].hreflang),
};

function buildAlternates(basePath) {
  const alts = LOCALES.map((l) => ({
    hreflang: LOCALE_META[l].hreflang,
    href: `${SITE_URL}${localizedPath(l, basePath)}`,
  }));
  alts.push({ hreflang: "x-default", href: `${SITE_URL}${localizedPath(DEFAULT_LOCALE, basePath)}` });
  return alts;
}

function jsonLdFor(pageKey, locale) {
  const lang = LOCALE_META[locale].hreflang;
  const url = `${SITE_URL}${localizedPath(locale, PAGE_BASE_PATH[pageKey])}`;
  switch (pageKey) {
    case "home":
      return [
        ORG,
        WEBSITE,
        {
          "@type": "WebPage",
          "@id": `${url}#webpage`,
          url,
          inLanguage: lang,
          name: TITLE_DESC[locale].home.t,
          isPartOf: { "@id": `${SITE_URL}/#website` },
          about: { "@id": `${SITE_URL}/#organization` },
          primaryImageOfPage: { "@type": "ImageObject", url: DEFAULT_OG_IMAGE },
        },
      ];
    case "product":
      return [
        {
          "@type": "Service",
          name: "dayli — Climate Health Copilot",
          serviceType: "Climate-aware health guidance",
          provider: { "@id": `${SITE_URL}/#organization` },
          areaServed: "IN",
          inLanguage: lang,
          audience: { "@type": "PeopleAudience", audienceType: "Pregnant women and caregivers of young children" },
          availableChannel: { "@type": "ServiceChannel", name: "WhatsApp", serviceUrl: "https://wa.me/" },
        },
      ];
    case "clinics":
      return [
        {
          "@type": "Service",
          name: "dayli for Clinics",
          serviceType: "Patient engagement and adherence",
          provider: { "@id": `${SITE_URL}/#organization` },
          inLanguage: lang,
          audience: { "@type": "BusinessAudience", audienceType: "Maternal and pediatric clinics" },
        },
      ];
    case "pharma":
      return [
        {
          "@type": "Service",
          name: "dayli for Pharma",
          serviceType: "Medication adherence and patient engagement",
          provider: { "@id": `${SITE_URL}/#organization` },
          inLanguage: lang,
          audience: { "@type": "BusinessAudience", audienceType: "Pharmaceutical and life sciences companies" },
        },
      ];
    case "about":
      return [
        { "@type": "AboutPage", url, name: "About dayli", inLanguage: lang, about: { "@id": `${SITE_URL}/#organization` } },
        ORG,
      ];
    case "privacy":
      return [
        { "@type": "WebPage", url, name: "Privacy at dayli", inLanguage: lang, isPartOf: { "@id": `${SITE_URL}/#website` } },
      ];
    default:
      return undefined;
  }
}

export const PAGES = [];
for (const locale of LOCALES) {
  const meta = LOCALE_META[locale];
  for (const pageKey of PAGE_KEYS) {
    const basePath = PAGE_BASE_PATH[pageKey];
    const path = localizedPath(locale, basePath);
    const td = TITLE_DESC[locale][pageKey];
    PAGES.push({
      pageKey,
      locale,
      htmlLang: meta.htmlLang,
      dir: meta.dir,
      basePath,
      path,
      title: td.t,
      description: td.d,
      jsonLd: jsonLdFor(pageKey, locale),
      alternates: buildAlternates(basePath),
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
  basePath: "/404",
  path: "/404",
  title: notFoundEn.seoTitle,
  description: notFoundEn.seoDescription,
  noindex: true,
  alternates: undefined,
  jsonLd: undefined,
});

export default { SITE_URL, DEFAULT_OG_IMAGE, PAGES, LOCALES, LOCALE_META, DEFAULT_LOCALE };
