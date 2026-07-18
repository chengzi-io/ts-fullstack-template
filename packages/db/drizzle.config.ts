import { defineConfig } from "drizzle-kit";

/**
 * Kit runs with cwd = packages/db.
 * Load connection via scripts: `node --env-file-if-exists=.env …` (this package's
 * `.env` only — never apps/server). Override with shell/CI DATABASE_*.
 * Unset DATABASE_URL → file:local.db under this package cwd.
 *
 * dialect "turso" covers both local `file:…` SQLite and remote libsql:// Turso.
 */
const databaseUrl = process.env.DATABASE_URL?.trim() || "file:local.db";
const databaseAuthToken = process.env.DATABASE_AUTH_TOKEN?.trim() || undefined;

export default defineConfig({
  dbCredentials: {
    authToken: databaseAuthToken,
    url: databaseUrl,
  },
  dialect: "turso",
  out: "./drizzle",
  schema: "./src/schema/*.ts",
  strict: true,
  verbose: true,
});
