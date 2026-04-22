import { useEffect } from "react";
import {
  SITE_URL,
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  buildJsonLdGraph,
  type PageSeo,
} from "@/lib/seo";
import { LOCALE_META } from "@/lib/i18n";

const MANAGED_ATTR = "data-seo-managed";

function setMeta(attr: "name" | "property", key: string, content: string) {
  const selector = `meta[${attr}="${cssEscape(key)}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    el.setAttribute(MANAGED_ATTR, "true");
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string, hreflang?: string) {
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${cssEscape(hreflang)}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    if (hreflang) el.setAttribute("hreflang", hreflang);
    el.setAttribute(MANAGED_ATTR, "true");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function cssEscape(s: string) {
  return s.replace(/(["\\])/g, "\\$1");
}

export function SEO({ seo }: { seo: PageSeo }) {
  useEffect(() => {
    const canonical = `${SITE_URL}${seo.path === "/" ? "/" : seo.path}`;
    const og = seo.ogImage ?? DEFAULT_OG_IMAGE;
    const meta = LOCALE_META[seo.locale];

    document.title = seo.title;
    document.documentElement.lang = meta.htmlLang;
    document.documentElement.dir = meta.dir;

    setMeta("name", "description", seo.description);
    setLink("canonical", canonical);

    setMeta("property", "og:title", seo.title);
    setMeta("property", "og:description", seo.description);
    setMeta("property", "og:url", canonical);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:image", og);
    setMeta("property", "og:locale", meta.htmlLang);

    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", seo.title);
    setMeta("name", "twitter:description", seo.description);
    setMeta("name", "twitter:image", og);

    setMeta(
      "name",
      "robots",
      seo.noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large",
    );

    // Replace all hreflang alternates each render so old tags can't drift.
    document.head
      .querySelectorAll('link[rel="alternate"][hreflang]')
      .forEach((el) => el.remove());
    for (const alt of seo.alternates) {
      const link = document.createElement("link");
      link.setAttribute("rel", "alternate");
      link.setAttribute("hreflang", alt.hreflang);
      link.setAttribute("href", alt.href);
      link.setAttribute(MANAGED_ATTR, "true");
      document.head.appendChild(link);
    }

    document.head
      .querySelectorAll('script[type="application/ld+json"]')
      .forEach((el) => el.remove());

    const graph = buildJsonLdGraph(seo.jsonLd);
    if (graph) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute(MANAGED_ATTR, "true");
      script.text = graph;
      document.head.appendChild(script);
    }
  }, [seo]);

  return null;
}
