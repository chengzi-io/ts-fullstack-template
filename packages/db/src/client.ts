import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

/**
 * Create a Drizzle client for libsql / SQLite.
 * Callers (apps) supply the URL — this package does not read process.env.
 */
export function createDb(url: string) {
  const client = createClient({ url });
  return drizzle({ client });
}

export type Database = ReturnType<typeof createDb>;
