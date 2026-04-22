export const SITE_NAME: string;

export interface FaqItem {
  q: string;
  a: string;
}

export const FAQ_ITEMS: FaqItem[];

export interface PageSeoData {
  path: string;
  title: string;
  description: string;
  ogImage?: string;
  noindex?: boolean;
  jsonLd?: object[];
}

export interface SeoData {
  SITE_URL: string;
  DEFAULT_OG_IMAGE: string;
  PAGES: Record<string, PageSeoData>;
}

export function buildSeoData(siteUrl: string): SeoData;
