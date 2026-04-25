import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:80";

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  // Self-contained: spin up the dev server if one isn't already running on
  // the target port. In Replit the `artifacts/dayli-website: web` workflow
  // is normally already serving on $PORT (proxied to :80), so reuse it.
  webServer: {
    command: "pnpm run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
