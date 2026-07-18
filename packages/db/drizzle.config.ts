import { defineConfig } from "drizzle-kit";

/**
 * Kit requires DATABASE_URL in process.env (via `.env` or CI).
 * Scripts: `node --env-file-if-exists=.env …` — copy `.env.example` first if needed.
 */
const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error(
    "Missing DATABASE_URL. Copy packages/db/.env.example → .env or export DATABASE_URL."
  );
}

export default defineConfig({
  dbCredentials: {
    authToken: process.env.DATABASE_AUTH_TOKEN?.trim() || undefined,
    url: databaseUrl,
  },
  dialect: "turso",
  out: "./drizzle",
  schema: "./src/schema/*.ts",
  strict: true,
  verbose: true,
});
