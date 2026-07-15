import { defineConfig } from "drizzle-kit";

/**
 * Kit runs with cwd = packages/db. drizzle-kit loads `.env` from cwd when present.
 * Override with DB_FILE_NAME (e.g. remote libsql URL); local default is file:local.db.
 */
const databaseUrl = process.env.DB_FILE_NAME?.trim() || "file:local.db";

export default defineConfig({
  dbCredentials: {
    url: databaseUrl,
  },
  dialect: "sqlite",
  out: "./drizzle",
  schema: "./src/schema/*.ts",
  strict: true,
  verbose: true,
});
