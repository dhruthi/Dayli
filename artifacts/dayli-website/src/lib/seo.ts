import { LOCALE_META, type Locale } from "./i18n";
import { TRANSLATIONS } from "./translations";
import {
  PAGE_BASE_PATHS,
  INDEXED_PAGE_KEYS,
  SITE_NAME,
  buildAlternates as buildAlternatesShared,
  buildJsonLdFor,
  type PageKey,
} from "./seo-shared";
import { localizedPath } from "./i18n";

export const SITE_URL =
  ((import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "")) ||
  "https://dayli.ai";

export { SITE_NAME };
export const DEFAULT_OG_IMAGE = `${SITE_URL}/opengraph.png`;

export type { PageKey };

export interface AlternateLink {
  hreflang: string;
  href: string;
}

export interface PageSeo {
  pageKey: PageKey;
  locale: Locale;
  basePath: string; // canonical (English) base path, e.g. "/product"
  path: string; // localized path, e.g. "/hi/product"
  title: string;
  description: string;
  ogImage?: string;
  noindex?: boolean;
  jsonLd?: object[];
  alternates: AlternateLink[];
  inLanguage: string;
}

// Re-export FAQ_ITEMS for English (FAQSection now reads from translations).
export const FAQ_ITEMS = TRANSLATIONS.en.faq;

export function buildAlternates(basePath: string): AlternateLink[] {
  return buildAlternatesShared(SITE_URL, basePath);
}

export function getPageSeo(pageKey: PageKey, locale: Locale): PageSeo {
  const t = TRANSLATIONS[locale];
  const basePath = PAGE_BASE_PATHS[pageKey];
  const path = localizedPath(locale, basePath);

  const titleDesc: Record<PageKey, { title: string; description: string }> = {
    home: { title: t.home.seoTitle, description: t.home.seoDescription },
    product: { title: t.product.seoTitle, description: t.product.seoDescription },
    clinics: { title: t.clinics.seoTitle, description: t.clinics.seoDescription },
    pharma: { title: t.pharma.seoTitle, description: t.pharma.seoDescription },
    about: { title: t.about.seoTitle, description: t.about.seoDescription },
    privacy: { title: t.privacy.seoTitle, description: t.privacy.seoDescription },
    notFound: { title: t.notFound.seoTitle, description: t.notFound.seoDescription },
  };

  return {
    pageKey,
    locale,
    basePath,
    path,
    title: titleDesc[pageKey].title,
    description: titleDesc[pageKey].description,
    noindex: pageKey === "notFound" ? true : undefined,
    jsonLd: buildJsonLdFor(pageKey, locale, { siteUrl: SITE_URL, defaultOgImage: DEFAULT_OG_IMAGE }),
    alternates: pageKey === "notFound" ? [] : buildAlternatesShared(SITE_URL, basePath),
    inLanguage: LOCALE_META[locale].hreflang,
  };
}

export function buildJsonLdGraph(jsonLd?: object[]): string | null {
  if (!jsonLd || jsonLd.length === 0) return null;
  return JSON.stringify({ "@context": "https://schema.org", "@graph": jsonLd });
}

export const ALL_INDEXED_PAGE_KEYS = INDEXED_PAGE_KEYS;
