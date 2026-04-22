import { useEffect } from "react";
import { SITE_URL, DEFAULT_OG_IMAGE, SITE_NAME, buildJsonLdGraph, type PageSeo } from "@/lib/seo";

const MANAGED_ATTR = "data-seo-managed";

/**
 * Update an existing meta tag (regardless of who created it) or create a new
 * one. Prerendered tags from scripts/prerender.mjs are reused so we never
 * end up with duplicate canonicals, descriptions, or OG tags after hydration.
 */
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

function setLink(rel: string, href: string) {
  const selector = `link[rel="${cssEscape(rel)}"]`;
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    el.setAttribute(MANAGED_ATTR, "true");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function cssEscape(s: string) {
  // Minimal CSS attribute-value escape — handles the keys we use.
  return s.replace(/(["\\])/g, "\\$1");
}

export function SEO({ seo }: { seo: PageSeo }) {
  useEffect(() => {
    const canonical = `${SITE_URL}${seo.path === "/" ? "/" : seo.path}`;
    const og = seo.ogImage ?? DEFAULT_OG_IMAGE;

    document.title = seo.title;
    setMeta("name", "description", seo.description);
    setLink("canonical", canonical);

    setMeta("property", "og:title", seo.title);
    setMeta("property", "og:description", seo.description);
    setMeta("property", "og:url", canonical);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:image", og);

    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", seo.title);
    setMeta("name", "twitter:description", seo.description);
    setMeta("name", "twitter:image", og);

    setMeta(
      "name",
      "robots",
      seo.noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large",
    );

    // JSON-LD is fully owned by this app: remove any existing ld+json blocks
    // (whether prerendered or previously injected) and emit a fresh graph for
    // the active route. This keeps structured data unambiguous after hydration.
    document
      .head
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
