import { createClient } from "@libsql/client";
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
  });
}

export type Database = ReturnType<typeof createDb>;
