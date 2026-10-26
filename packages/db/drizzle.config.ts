import { defineConfig } from "drizzle-kit";

// Kit only: scripts use `--env-file-if-exists=.env` (not createDb).
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
  // Each module owns its tables (see src/testing.ts for the same convention).
  schema: "../../modules/*/src/schema.ts",
  strict: true,
  verbose: true,
});
