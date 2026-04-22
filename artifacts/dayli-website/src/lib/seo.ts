import { buildSeoData, FAQ_ITEMS, SITE_NAME, type PageSeoData } from "./seo-data.mjs";

const RUNTIME_SITE_URL =
  ((import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "")) ||
  "https://dayli.ai";

const data = buildSeoData(RUNTIME_SITE_URL);

export const SITE_URL = data.SITE_URL;
export const DEFAULT_OG_IMAGE = data.DEFAULT_OG_IMAGE;
export { SITE_NAME, FAQ_ITEMS };

export type PageSeo = PageSeoData;

export const PAGE_SEO: Record<string, PageSeo> = data.PAGES;

export function buildJsonLdGraph(jsonLd?: object[]): string | null {
  if (!jsonLd || jsonLd.length === 0) return null;
  return JSON.stringify({ "@context": "https://schema.org", "@graph": jsonLd });
}
