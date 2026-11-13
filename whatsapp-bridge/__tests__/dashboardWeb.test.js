import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT_DIR = path.resolve(import.meta.dirname, '../..');
const DASHBOARD_WEB_DIR = path.join(ROOT_DIR, 'dashboard-web');

describe('Dashboard Web Vercel Deployment', () => {
  it('has valid vercel.json configuration with backend proxy rewrites', () => {
    const configPath = path.join(DASHBOARD_WEB_DIR, 'vercel.json');
    expect(fs.existsSync(configPath)).toBe(true);

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    expect(config.buildCommand).toBe('node build.mjs');
    expect(config.outputDirectory).toBe('dist');

    const apiRewrite = (config.rewrites || []).find((r) => r.source === '/api/:path*');
    expect(apiRewrite).toBeDefined();
    expect(apiRewrite.destination).toBe('https://api.dayli.ai/api/:path*');
  });

  it('build.mjs generates static distribution matching server templates', () => {
    // Run build.mjs
    execSync('node build.mjs', { cwd: DASHBOARD_WEB_DIR, stdio: 'pipe' });

    const distDir = path.join(DASHBOARD_WEB_DIR, 'dist');
    const dashboardHtml = path.join(distDir, 'dashboard/index.html');
    const loginHtml = path.join(distDir, 'login/index.html');
    const indexHtml = path.join(distDir, 'index.html');

    expect(fs.existsSync(dashboardHtml)).toBe(true);
    expect(fs.existsSync(loginHtml)).toBe(true);
    expect(fs.existsSync(indexHtml)).toBe(true);

    // Verify dashboard content matches source HTML
    const srcDashboard = fs.readFileSync(path.join(ROOT_DIR, 'whatsapp-bridge/lib/climateHealthDashboard.html'), 'utf8');
    const builtDashboard = fs.readFileSync(dashboardHtml, 'utf8');
    expect(builtDashboard).toBe(srcDashboard);

    // Verify login page hides demo credentials in production build
    const builtLogin = fs.readFileSync(loginHtml, 'utf8');
    expect(builtLogin).not.toContain('Authorized Evaluator Credentials');
    expect(builtLogin).not.toContain('fillDemo()');
    expect(builtLogin).toContain('Clinical & Maternal Intelligence Sign In');

    // Verify root redirect
    const builtIndex = fs.readFileSync(indexHtml, 'utf8');
    expect(builtIndex).toContain('url=/dashboard');
  });
});
