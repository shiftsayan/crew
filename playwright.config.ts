import { defineConfig } from "@playwright/test";

const port = Number(process.env.CREW_E2E_PORT ?? 3100);
const host = process.env.CREW_E2E_HOST ?? "127.0.0.1";
const baseURL = `http://${host}:${port}`;

export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL,
    browserName: "chromium",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --hostname ${host} --port ${port}`,
    env: {
      ADMIN_PASSWORD:
        process.env.ADMIN_PASSWORD ?? "crew-e2e-admin-password",
      ADMIN_SESSION_SECRET:
        process.env.ADMIN_SESSION_SECRET ??
        "crew-e2e-session-secret-that-is-at-least-32-characters",
      CREW_NEXT_DIST_DIR:
        process.env.CREW_NEXT_DIST_DIR ?? ".next-playwright",
      ...(process.env.DATABASE_URL
        ? { DATABASE_URL: process.env.DATABASE_URL }
        : {}),
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: baseURL,
  },
});
