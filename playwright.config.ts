import { defineConfig } from "@playwright/test";
import "dotenv/config";

export default defineConfig({
  testDir: "./tests",
  testMatch: [
    "ui.spec.ts",
    "security.spec.ts",
    "attendance.spec.ts",
    "controls.spec.ts",
    "layout-students.spec.ts",
  ],
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: "line",
  outputDir: ".local/playwright-results",
  use: {
    baseURL: "http://localhost:3101",
    browserName: "chromium",
    actionTimeout: 10000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm exec tsx scripts/start-ui-server.ts",
    url: "http://localhost:3101/login",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
