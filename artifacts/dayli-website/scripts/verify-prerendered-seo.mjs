#!/usr/bin/env node
// Post-prerender smoke test: for every PAGES entry produced by
// scripts/seo-data.mjs, open the emitted HTML file under dist/public
// and assert it contains the expected <title> and
// <meta name="description"> for that locale + page. Catches regressions
// where the prerender pipeline writes the wrong locale's copy, drops a
// tag, or breaks escaping.
//
// Fails the build with a clear, aggregated error naming the offending
// locale + page if anything is missing or mismatched.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist", "public");
const SEO_DATA_PATH = path.join(__dirname, "seo-data.mjs");

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}

function fileForPage(page) {
  if (page.path === "/") return path.join(DIST, "index.html");
  if (page.path === "/404") return path.join(DIST, "404.html");
  return path.join(DIST, page.path.replace(/^\//, ""), "index.html");
}

let PAGES;
try {
  ({ PAGES } = await import(pathToFileURL(SEO_DATA_PATH).href));
} catch (err) {
  console.error(
    `[verify-prerendered-seo] Failed to import PAGES from ${SEO_DATA_PATH}: ${err?.message ?? err}`,
  );
  process.exit(1);
}

if (!Array.isArray(PAGES) || PAGES.length === 0) {
  console.error("[verify-prerendered-seo] PAGES from seo-data.mjs is empty.");
  process.exit(1);
}

const errors = [];

for (const page of PAGES) {
  const file = fileForPage(page);
  const label = `locale="${page.locale ?? "?"}" page="${page.pageKey ?? "?"}" path="${page.path}"`;
  let html;
  try {
    html = await fs.readFile(file, "utf8");
  } catch (err) {
    errors.push(`${label}: expected prerendered file ${path.relative(ROOT, file)} is missing (${err?.code ?? err?.message ?? err}).`);
    continue;
  }

  const expectedTitle = `<title>${escapeHtml(page.title)}</title>`;
  if (!html.includes(expectedTitle)) {
    const actualTitle = html.match(/<title>([\s\S]*?)<\/title>/i);
    errors.push(
      `${label}: <title> mismatch in ${path.relative(ROOT, file)}.\n` +
        `      expected: ${JSON.stringify(page.title)}\n` +
        `      found:    ${actualTitle ? JSON.stringify(actualTitle[1]) : "<no <title> tag>"}`,
    );
  }

  const descRe = /<meta\b[^>]*\bname=["']description["'][^>]*>/i;
  const descMatch = html.match(descRe);
  if (!descMatch) {
    errors.push(`${label}: no <meta name="description"> found in ${path.relative(ROOT, file)}.`);
  } else {
    const contentMatch = descMatch[0].match(/\bcontent=(["'])([\s\S]*?)\1/i);
    const contentValue = contentMatch ? contentMatch[2] : null;
    const expectedContent = escapeAttr(page.description);
    if (contentValue === null || contentValue !== expectedContent) {
      errors.push(
        `${label}: <meta name="description"> mismatch in ${path.relative(ROOT, file)}.\n` +
          `      expected: ${JSON.stringify(expectedContent)}\n` +
          `      found:    ${contentValue !== null ? JSON.stringify(contentValue) : "<no content attr>"}`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error("\n[verify-prerendered-seo] Prerendered SEO verification failed:\n");
  for (const e of errors) console.error(`  - ${e}`);
  console.error(
    `\nThe prerender pipeline (scripts/prerender.mjs) emitted HTML that does not ` +
      `match the expected per-locale title/description. Fix the pipeline or the ` +
      `source copy in src/lib/translations.ts and re-run the build.\n`,
  );
  process.exit(1);
}

console.log(
  `[verify-prerendered-seo] OK — verified <title> and <meta name="description"> ` +
    `in ${PAGES.length} prerendered HTML file(s).`,
);
