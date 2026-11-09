import { defineConfig, devices } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Firefox 157 consults the real Firefox app-data directory even with a test
// profile. Keep test state separate on macOS 27, without granting disk access.
// https://github.com/microsoft/playwright/issues/42768
const firefoxHome = process.platform === "darwin"
  ? mkdtempSync(join(tmpdir(), "mnemo-firefox-"))
  : undefined;

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3005";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox-mobile-layout",
      testMatch: "**/mobile-readiness.spec.ts",
      use: {
        ...devices["Desktop Firefox"],
        hasTouch: true,
        launchOptions: firefoxHome ? { env: { ...process.env, CFFIXED_USER_HOME: firefoxHome } } : {},
      },
    },
    {
      name: "webkit-mobile",
      testMatch: "**/mobile-readiness.spec.ts",
      use: { ...devices["iPhone 13"] },
    },
  ],
});
