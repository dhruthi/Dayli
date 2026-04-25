import { defineConfig, devices } from "@playwright/test";

// In Replit the `artifacts/dayli-website: web` workflow already serves on the
// platform-assigned $PORT (proxied to :80). Locally / in CI without a running
// server, the webServer config below boots one with the same env contract.
const PLAYWRIGHT_PORT = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PLAYWRIGHT_PORT}`;

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
  // Reuse an existing dev server when present (Replit workflow case);
  // otherwise spin one up with the env vars vite.config.ts requires
  // (PORT and BASE_PATH). Default BASE_PATH to "/" so the dev server
  // mounts at the root of localhost:PLAYWRIGHT_PORT.
  webServer: {
    command: "pnpm run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      PORT: String(PLAYWRIGHT_PORT),
      BASE_PATH: process.env.BASE_PATH ?? "/",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
