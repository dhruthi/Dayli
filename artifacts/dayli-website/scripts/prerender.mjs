#!/usr/bin/env node
/**
 * Post-build prerender step.
 *
 * Vite produces a single dist/public/index.html. This script reads that file,
 * substitutes per-route <title>, meta description, canonical, OG/Twitter tags,
 * and JSON-LD into the <head>, and writes one static HTML file per route.
 *
 * The body remains the same SPA shell — React hydrates on top — but every URL
 * served from the build now ships the correct head and structured data, which
 * is what AI answer engines and search crawlers extract first.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist", "public");
const TEMPLATE_PATH = path.join(DIST, "index.html");
const SERVER_ENTRY = path.join(ROOT, "dist", "server", "entry-server.js");

async function loadServerRender() {
  try {
    await fs.access(SERVER_ENTRY);
    const mod = await import(pathToFileURL(SERVER_ENTRY).href);
    return mod.render;
  } catch {
    console.warn(
      `[prerender] No SSR bundle at ${SERVER_ENTRY}; head will be injected but body will remain empty.`,
    );
    return null;
  }
}

async function loadSeo() {
  // Single source of truth: src/lib/seo-data.mjs is also imported by
  // src/lib/seo.ts at runtime, so per-route metadata cannot drift between
  // the served HTML and the React app's hydrated head.
  const dataModule = path.join(ROOT, "src", "lib", "seo-data.mjs");
  const { buildSeoData } = await import(pathToFileURL(dataModule).href);
  const siteUrl =
    process.env.VITE_SITE_URL || process.env.SITE_URL || "https://dayli.ai";
  return buildSeoData(siteUrl);
}

function renderHead({ title, description, canonical, ogImage, noindex, jsonLd, siteName }) {
  const robots = noindex
    ? "noindex, nofollow"
    : "index, follow, max-image-preview:large";
  const m = `data-seo-managed="true"`;
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta ${m} name="description" content="${escapeAttr(description)}" />`,
    `<link ${m} rel="canonical" href="${escapeAttr(canonical)}" />`,
    `<meta ${m} name="robots" content="${robots}" />`,
    `<meta ${m} property="og:type" content="website" />`,
    `<meta ${m} property="og:site_name" content="${escapeAttr(siteName)}" />`,
    `<meta ${m} property="og:title" content="${escapeAttr(title)}" />`,
    `<meta ${m} property="og:description" content="${escapeAttr(description)}" />`,
    `<meta ${m} property="og:url" content="${escapeAttr(canonical)}" />`,
    `<meta ${m} property="og:image" content="${escapeAttr(ogImage)}" />`,
    `<meta ${m} name="twitter:card" content="summary_large_image" />`,
    `<meta ${m} name="twitter:title" content="${escapeAttr(title)}" />`,
    `<meta ${m} name="twitter:description" content="${escapeAttr(description)}" />`,
    `<meta ${m} name="twitter:image" content="${escapeAttr(ogImage)}" />`,
  ];
  if (jsonLd) {
    tags.push(
      `<script ${m} type="application/ld+json">${jsonLd
        .replace(/</g, "\\u003c")
        .replace(/-->/g, "--\\u003e")}</script>`,
    );
  }
  return tags.join("\n    ");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}

function injectHead(template, headHtml) {
  // Remove existing <title> and <meta name="description"> from index.html so
  // ours wins and there are no duplicates.
  let out = template
    .replace(/<title>[\s\S]*?<\/title>\s*/i, "")
    .replace(/<meta\s+name=["']description["'][^>]*>\s*/gi, "")
    .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>\s*/gi, "")
    .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>\s*/gi, "");
  return out.replace(/<\/head>/i, `    ${headHtml}\n  </head>`);
}

function injectBody(template, bodyHtml) {
  if (!bodyHtml) return template;
  return template.replace(
    /<div id="root">\s*<\/div>/i,
    `<div id="root">${bodyHtml}</div>`,
  );
}

async function main() {
  const template = await fs.readFile(TEMPLATE_PATH, "utf8");
  const { SITE_URL, DEFAULT_OG_IMAGE, PAGES, SITE_NAME } = await loadSeo();
  const render = await loadServerRender();

  for (const page of Object.values(PAGES)) {
    if (page.noindex) continue;
    const canonical = `${SITE_URL}${page.path === "/" ? "/" : page.path}`;
    const headHtml = renderHead({
      title: page.title,
      description: page.description,
      canonical,
      ogImage: page.ogImage ?? DEFAULT_OG_IMAGE,
      noindex: page.noindex,
      siteName: SITE_NAME,
      jsonLd: page.jsonLd
        ? JSON.stringify({ "@context": "https://schema.org", "@graph": page.jsonLd })
        : null,
    });

    let bodyHtml = "";
    if (render) {
      try {
        bodyHtml = render(page.path);
      } catch (err) {
        console.warn(`[prerender] SSR failed for ${page.path}:`, err?.message ?? err);
      }
    }

    const html = injectBody(injectHead(template, headHtml), bodyHtml);

    if (page.path === "/") {
      await fs.writeFile(TEMPLATE_PATH, html, "utf8");
    } else {
      const dir = path.join(DIST, page.path.replace(/^\//, ""));
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "index.html"), html, "utf8");
    }
    // eslint-disable-next-line no-console
    console.log(`prerendered ${page.path}${bodyHtml ? " (with body)" : ""}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
