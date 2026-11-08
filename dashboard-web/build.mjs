#!/usr/bin/env node

/**
 * Static site generator for the Dayli AI Clinical Dashboard on Vercel.
 *
 * Emits:
 *   dist/index.html            -> redirect to /dashboard
 *   dist/dashboard/index.html  -> clinical climate-health dashboard
 *   dist/login/index.html      -> login page (demo credentials stripped)
 *
 * Uses the exact same template and auth generator as the Express server so
 * the Vercel static deployment and Oracle backend remain 100% in sync.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLoginPageHtml } from '../whatsapp-bridge/lib/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'dist');
const DASHBOARD_HTML_PATH = path.join(__dirname, '../whatsapp-bridge/lib/climateHealthDashboard.html');

function writeFile(relPath, content) {
  const fullPath = path.join(OUT_DIR, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`✓ Generated ${relPath} (${(Buffer.byteLength(content, 'utf8') / 1024).toFixed(1)} KB)`);
}

// 1. Clean output directory
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

// 2. Generate dashboard/index.html
const dashboardHtml = fs.readFileSync(DASHBOARD_HTML_PATH, 'utf8');
writeFile('dashboard/index.html', dashboardHtml);

// 3. Generate login/index.html
const loginHtml = getLoginPageHtml({ isProduction: true });
writeFile('login/index.html', loginHtml);

// 4. Generate root index.html (immediate meta-refresh to /dashboard)
const rootRedirectHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Dayli AI Dashboard</title>
  <meta http-equiv="refresh" content="0; url=/dashboard">
  <link rel="canonical" href="/dashboard">
</head>
<body>
  <p>Redirecting to <a href="/dashboard">Dayli AI Clinical Dashboard</a>...</p>
</body>
</html>
`;
writeFile('index.html', rootRedirectHtml);

console.log('Static build complete.');
