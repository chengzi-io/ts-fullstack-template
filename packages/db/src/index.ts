import { createClient } from "@libsql/client";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";

export interface DatabaseConfig {
  authToken?: string;
  /** e.g. `file:../../local.db`, `libsql://…` (relative file: = process.cwd()) */
  url: string;
}

/** Hosts pass validated config — does not read `process.env`. */
export function createDb(config: DatabaseConfig) {
  const client = createClient({
    authToken: config.authToken?.trim(),
    url: config.url.trim(),
  });
  const database = drizzle({ client });

  return Object.assign(database, {
    close(): void {
      if (!client.closed) {
        client.close();
      }
    },
    /** Readiness probe. Throws if unreachable. */
    async ping(): Promise<void> {
      await database.run(sql`SELECT 1`);
    },
  });
}

export type Database = ReturnType<typeof createDb>;
