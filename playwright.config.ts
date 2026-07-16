import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  expect: { toHaveScreenshot: { animations: "disabled", maxDiffPixelRatio: 0.015 } },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run start -- -p 3100",
    url: "http://127.0.0.1:3100/admin-login",
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      ...process.env,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "admin",
      ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET || "visual-regression-secret-at-least-32-characters",
      ADMIN_ACCOUNTS_JSON: process.env.ADMIN_ACCOUNTS_JSON || JSON.stringify([{ id: "visual-marketing", name: "Visual Marketing", role: "marketing", password: "visual-marketing-password" }]),
    },
  },
  snapshotPathTemplate: "{testDir}/__screenshots__/{projectName}/{arg}{ext}",
});
