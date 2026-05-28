import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";
config({ path: ".env.local" });

const BASE_URL = process.env["E2E_BASE_URL"] ?? "http://localhost:3000";
const isLocal = BASE_URL === "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env["CI"],
  retries: 0,
  workers: 1,
  reporter: [["html", { outputFolder: "playwright-report", open: "never" }], ["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: "setup",
      testMatch: "**/auth.setup.ts",
      use: { storageState: undefined },
    },
    {
      name: "chromium",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/session.json",
      },
    },
  ],
  ...(isLocal
    ? {
        webServer: {
          command: "pnpm dev",
          url: "http://localhost:3000",
          reuseExistingServer: true,
        },
      }
    : {}),
});
