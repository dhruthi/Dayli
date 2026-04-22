import { LOCALES, LOCALE_META, DEFAULT_LOCALE, localizedPath, type Locale } from "./i18n";
import { TRANSLATIONS } from "./translations";

export const SITE_URL =
  ((import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "")) ||
  "https://dayli.ai";

export const SITE_NAME = "dayli.ai";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/opengraph.png`;

export type PageKey =
  | "home"
  | "product"
  | "clinics"
  | "pharma"
  | "about"
  | "privacy"
  | "notFound";

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

const PAGE_BASE_PATHS: Record<PageKey, string> = {
  home: "/",
  product: "/product",
  clinics: "/clinics",
  pharma: "/pharma",
  about: "/about",
  privacy: "/privacy",
  notFound: "/404",
};

const INDEXED_PAGES: PageKey[] = ["home", "product", "clinics", "pharma", "about", "privacy"];

const PAGE_NAMES: Record<PageKey, string> = {
  home: "Home",
  product: "Product",
  clinics: "For Clinics",
  pharma: "For Pharma",
  about: "About",
  privacy: "Privacy",
  notFound: "Not Found",
};

const ORG = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "dayli.ai",
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.svg`,
  description:
    "dayli is an AI-powered Climate Health Copilot for women and children, delivering real-time personalized guidance on WhatsApp.",
  sameAs: [] as string[],
};

function websiteNode(locale: Locale) {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: LOCALES.map((l) => LOCALE_META[l].hreflang),
  };
}

function faqNode(locale: Locale) {
  return {
    "@type": "FAQPage",
    "@id": `${SITE_URL}/#faq-${locale}`,
    inLanguage: LOCALE_META[locale].hreflang,
    mainEntity: TRANSLATIONS[locale].faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

function breadcrumbNode(locale: Locale, items: { name: string; basePath: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${localizedPath(locale, item.basePath)}`,
    })),
  };
}

export function buildAlternates(basePath: string): AlternateLink[] {
  const alts: AlternateLink[] = LOCALES.map((l) => ({
    hreflang: LOCALE_META[l].hreflang,
    href: `${SITE_URL}${localizedPath(l, basePath)}`,
  }));
  alts.push({
    hreflang: "x-default",
    href: `${SITE_URL}${localizedPath(DEFAULT_LOCALE, basePath)}`,
  });
  return alts;
}

function jsonLdFor(pageKey: PageKey, locale: Locale): object[] | undefined {
  const t = TRANSLATIONS[locale];
  const lang = LOCALE_META[locale].hreflang;
  const url = `${SITE_URL}${localizedPath(locale, PAGE_BASE_PATHS[pageKey])}`;

  switch (pageKey) {
    case "home":
      return [
        ORG,
        websiteNode(locale),
        faqNode(locale),
        {
          "@type": "WebPage",
          "@id": `${url}#webpage`,
          url,
          name: t.home.seoTitle,
          inLanguage: lang,
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
        breadcrumbNode(locale, [
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
          provider: { "@id": `${SITE_URL}/#organization` },
          inLanguage: lang,
          audience: { "@type": "BusinessAudience", audienceType: "Maternal and pediatric clinics" },
        },
        breadcrumbNode(locale, [
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
          provider: { "@id": `${SITE_URL}/#organization` },
          inLanguage: lang,
          audience: { "@type": "BusinessAudience", audienceType: "Pharmaceutical and life sciences companies" },
        },
        breadcrumbNode(locale, [
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
          about: { "@id": `${SITE_URL}/#organization` },
        },
        ORG,
        breadcrumbNode(locale, [
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
          isPartOf: { "@id": `${SITE_URL}/#website` },
        },
        breadcrumbNode(locale, [
          { name: PAGE_NAMES.home, basePath: "/" },
          { name: PAGE_NAMES.privacy, basePath: "/privacy" },
        ]),
      ];
    default:
      return undefined;
  }
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
    jsonLd: jsonLdFor(pageKey, locale),
    alternates: pageKey === "notFound" ? [] : buildAlternates(basePath),
    inLanguage: LOCALE_META[locale].hreflang,
  };
}

export function buildJsonLdGraph(jsonLd?: object[]): string | null {
  if (!jsonLd || jsonLd.length === 0) return null;
  return JSON.stringify({ "@context": "https://schema.org", "@graph": jsonLd });
}

export const ALL_INDEXED_PAGE_KEYS = INDEXED_PAGES;
