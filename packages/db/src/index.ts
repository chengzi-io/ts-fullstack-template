import { createClient } from "@libsql/client";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";

/** Reads `DATABASE_URL` and optional `DATABASE_AUTH_TOKEN` from process.env. */
export function createDb() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "Missing DATABASE_URL. Set a local file: URL or remote libsql:// Turso URL."
    );
  }

  const client = createClient({
    authToken: process.env.DATABASE_AUTH_TOKEN?.trim() || undefined,
    url,
  });
  const database = drizzle({ client });

  return Object.assign(database, {
    close(): void {
      if (!client.closed) {
        client.close();
      }
    },
    /** Connectivity check for readiness probes. Throws if the DB is unreachable. */
    async ping(): Promise<void> {
      await database.run(sql`SELECT 1`);
    },
  });
}

export type Database = ReturnType<typeof createDb>;
