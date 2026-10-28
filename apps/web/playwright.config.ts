import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const SERVER_PORT = 3100;
const WEB_PORT = 4173;

// Reports and traces stay out of the repo: CI fails on a dirty working tree.
const scratchDir = mkdtempSync(path.join(tmpdir(), "web-e2e-"));
// Absolute path: kit (packages/db) and the host (apps/server) run from
// different cwds, so a relative file: URL would not be the same database.
const databaseUrl = `file:${path.join(scratchDir, "e2e.db")}`;

const serverEnv = [
  `DATABASE_URL=${databaseUrl}`,
  // A file: database in production needs this opt-in; one host, one file.
  "DATABASE_SINGLE_INSTANCE=true",
  "NODE_ENV=production",
  `PORT=${SERVER_PORT}`,
].join(" ");

export default defineConfig({
  forbidOnly: !!process.env.CI,
  outputDir: path.join(scratchDir, "test-results"),
  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  // A trace of the first CI retry shows what failed without a rerun.
  retries: process.env.CI ? 1 : 0,
  testDir: "e2e",
  testMatch: "*.e2e.ts",
  timeout: 30_000,
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: "on-first-retry",
  },
  webServer: [
    {
      // A fresh, private database every run: push to a brand-new file, then
      // serve the built bundle. Never reuse a running host (it may be on local.db).
      command: [
        `DATABASE_URL=${databaseUrl} pnpm --filter @workspace/db db:push`,
        `${serverEnv} pnpm --filter server start`,
      ].join(" && "),
      reuseExistingServer: false,
      timeout: 120_000,
      url: `http://localhost:${SERVER_PORT}/healthz`,
    },
    {
      // `vite preview` inherits server.proxy, so /trpc reaches the host above.
      command: `API_PROXY_TARGET=http://localhost:${SERVER_PORT} pnpm exec vite preview --port ${WEB_PORT} --strictPort`,
      reuseExistingServer: false,
      timeout: 120_000,
      url: `http://localhost:${WEB_PORT}`,
    },
  ],
  // Every worker would share the one database the host serves.
  workers: 1,
});
