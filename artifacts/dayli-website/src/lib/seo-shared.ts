// Single source of truth for SEO surface area shared between the runtime
// React app (src/lib/seo.ts) and the build-time prerender sidecar
// (scripts/seo-data.mjs). Page base paths, the Organization/WebSite
// JSON-LD identity, and per-page JSON-LD builders all live here so editing
// any of them updates both the live <head> and the prerendered HTML.
//
// This file is intentionally written as plain stripable TypeScript so
// Node 24+ can import it natively from the .mjs sidecar via type-stripping
// (same mechanism already used to import translations.ts at build time).

import { LOCALES, LOCALE_META, DEFAULT_LOCALE, localizedPath, type Locale } from "./i18n.ts";
import { TRANSLATIONS } from "./translations.ts";

export type PageKey =
  | "home"
  | "product"
  | "clinics"
  | "pharma"
  | "about"
  | "privacy"
  | "notFound";

export const PAGE_BASE_PATHS: Record<PageKey, string> = {
  home: "/",
  product: "/product",
  clinics: "/clinics",
  pharma: "/pharma",
  about: "/about",
  privacy: "/privacy",
  notFound: "/404",
};

export const INDEXED_PAGE_KEYS: PageKey[] = [
  "home",
  "product",
  "clinics",
  "pharma",
  "about",
  "privacy",
];

export const PAGE_NAMES: Record<PageKey, string> = {
  home: "Home",
  product: "Product",
  clinics: "For Clinics",
  pharma: "For Pharma",
  about: "About",
  privacy: "Privacy",
  notFound: "Not Found",
};

export const SITE_NAME = "dayli.ai";

export interface SeoContext {
  siteUrl: string;
  defaultOgImage: string;
}

export function buildOrgNode(siteUrl: string) {
  return {
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: SITE_NAME,
    url: siteUrl,
    logo: `${siteUrl}/favicon.svg`,
    description:
      "dayli is an AI-powered Climate Health Copilot for women and children, delivering real-time personalized guidance on WhatsApp.",
    sameAs: [] as string[],
  };
}

export function buildWebsiteNode(siteUrl: string) {
  return {
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    url: siteUrl,
    name: SITE_NAME,
    publisher: { "@id": `${siteUrl}/#organization` },
    inLanguage: LOCALES.map((l) => LOCALE_META[l].hreflang),
  };
}

export function buildFaqNode(siteUrl: string, locale: Locale) {
  return {
    "@type": "FAQPage",
    "@id": `${siteUrl}/#faq-${locale}`,
    inLanguage: LOCALE_META[locale].hreflang,
    mainEntity: TRANSLATIONS[locale].faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function buildBreadcrumbNode(
  siteUrl: string,
  locale: Locale,
  items: { name: string; basePath: string }[],
) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${siteUrl}${localizedPath(locale, item.basePath)}`,
    })),
  };
}

export function buildAlternates(siteUrl: string, basePath: string) {
  const alts = LOCALES.map((l) => ({
    hreflang: LOCALE_META[l].hreflang,
    href: `${siteUrl}${localizedPath(l, basePath)}`,
  }));
  alts.push({
    hreflang: "x-default",
    href: `${siteUrl}${localizedPath(DEFAULT_LOCALE, basePath)}`,
  });
  return alts;
}

export function buildJsonLdFor(
  pageKey: PageKey,
  locale: Locale,
  ctx: SeoContext,
): object[] | undefined {
  const { siteUrl, defaultOgImage } = ctx;
  const t = TRANSLATIONS[locale];
  const lang = LOCALE_META[locale].hreflang;
  const url = `${siteUrl}${localizedPath(locale, PAGE_BASE_PATHS[pageKey])}`;

  switch (pageKey) {
    case "home":
      return [
        buildOrgNode(siteUrl),
        buildWebsiteNode(siteUrl),
        buildFaqNode(siteUrl, locale),
        {
          "@type": "WebPage",
          "@id": `${url}#webpage`,
          url,
          name: t.home.seoTitle,
          inLanguage: lang,
          isPartOf: { "@id": `${siteUrl}/#website` },
          about: { "@id": `${siteUrl}/#organization` },
          primaryImageOfPage: { "@type": "ImageObject", url: defaultOgImage },
        },
      ];
    case "product":
      return [
        {
          "@type": "Service",
          name: "dayli — Climate Health Copilot",
          serviceType: "Climate-aware health guidance",
          provider: { "@id": `${siteUrl}/#organization` },
          areaServed: "IN",
          inLanguage: lang,
          audience: {
            "@type": "PeopleAudience",
            audienceType: "Pregnant women and caregivers of young children",
          },
          availableChannel: {
            "@type": "ServiceChannel",
            name: "WhatsApp",
            serviceUrl: "https://wa.me/",
          },
        },
        {
          "@type": "HowTo",
          name: t.product.h1,
          inLanguage: lang,
          step: t.home.how.steps.map((s) => ({
            "@type": "HowToStep",
            name: s.title,
            text: s.body,
          })),
        },
        buildBreadcrumbNode(siteUrl, locale, [
          { name: PAGE_NAMES.home, basePath: "/" },
          { name: PAGE_NAMES.product, basePath: "/product" },
        ]),
      ];
    case "clinics":
      return [
        {
          "@type": "Service",
          name: "dayli for Clinics",
          serviceType: "Patient engagement and adherence",
          provider: { "@id": `${siteUrl}/#organization` },
          inLanguage: lang,
          audience: { "@type": "BusinessAudience", audienceType: "Maternal and pediatric clinics" },
        },
        buildBreadcrumbNode(siteUrl, locale, [
          { name: PAGE_NAMES.home, basePath: "/" },
          { name: PAGE_NAMES.clinics, basePath: "/clinics" },
        ]),
      ];
    case "pharma":
      return [
        {
          "@type": "Service",
          name: "dayli for Pharma",
          serviceType: "Medication adherence and patient engagement",
          provider: { "@id": `${siteUrl}/#organization` },
          inLanguage: lang,
          audience: { "@type": "BusinessAudience", audienceType: "Pharmaceutical and life sciences companies" },
        },
        buildBreadcrumbNode(siteUrl, locale, [
          { name: PAGE_NAMES.home, basePath: "/" },
          { name: PAGE_NAMES.pharma, basePath: "/pharma" },
        ]),
      ];
    case "about":
      return [
        {
          "@type": "AboutPage",
          url,
          name: t.about.h1,
          inLanguage: lang,
          about: { "@id": `${siteUrl}/#organization` },
        },
        buildOrgNode(siteUrl),
        buildBreadcrumbNode(siteUrl, locale, [
          { name: PAGE_NAMES.home, basePath: "/" },
          { name: PAGE_NAMES.about, basePath: "/about" },
        ]),
      ];
    case "privacy":
      return [
        {
          "@type": "WebPage",
          url,
          name: t.privacy.h1,
          inLanguage: lang,
          isPartOf: { "@id": `${siteUrl}/#website` },
        },
        buildBreadcrumbNode(siteUrl, locale, [
          { name: PAGE_NAMES.home, basePath: "/" },
          { name: PAGE_NAMES.privacy, basePath: "/privacy" },
        ]),
      ];
    default:
      return undefined;
  }
}
