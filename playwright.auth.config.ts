import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
for (const file of [".env.test.local", ".env.local"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
for (const key of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
]) {
  if (!process.env[key])
    throw new Error(
      `Missing ${key}. Real integration tests require local Supabase; see docs/SPRINT-2.md.`,
    );
}
const databaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;
if (!["localhost", "127.0.0.1", "[::1]"].includes(databaseHost)) {
  throw new Error("Integration fixtures may run only against local Supabase.");
}
export default defineConfig({
  outputDir: "test-results/auth",
  testDir: "./tests/auth",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { NEXT_PUBLIC_SITE_URL: baseURL, SUPABASE_SERVICE_ROLE_KEY: "" },
  },
});
