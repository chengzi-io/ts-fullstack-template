import { createClient, LibsqlError } from "@libsql/client";
import { type AnyColumn, type SQL, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";

export interface DatabaseConfig {
  authToken?: string;
  /** e.g. `file:../../local.db`, `libsql://…` (relative file: = process.cwd()) */
  url: string;
}

/** Hosts pass validated config — does not read `process.env`. */
export function createDb(config: DatabaseConfig) {
  const client = createClient({
    authToken: config.authToken?.trim() || undefined,
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

/**
 * A database or an open transaction. Repo factories take this, so a use case
 * spanning modules runs atomically: `db.transaction((tx) => …createXRepo(tx)…)`.
 */
export type Executor =
  | Database
  | Parameters<Parameters<Database["transaction"]>[0]>[0];

const FOREIGN_KEY_FAILED = "FOREIGN KEY constraint failed";

/**
 * True when a write broke a foreign key: a missing parent on insert/update,
 * or an `onDelete: "restrict"` delete. SQLite reports the restrict case as
 * SQLITE_CONSTRAINT_TRIGGER, so match its message, not `extendedCode`.
 * Drizzle wraps driver errors, hence the walk down `cause`.
 */
export function isForeignKeyViolation(error: unknown): boolean {
  let current: unknown = error;
  while (current instanceof Error) {
    if (
      current instanceof LibsqlError &&
      current.code === "SQLITE_CONSTRAINT" &&
      current.message.includes(FOREIGN_KEY_FAILED)
    ) {
      return true;
    }
    current = current.cause;
  }
  return false;
}

/**
 * Case-insensitive "column contains q". `q` is a bound parameter, so `%` and
 * `_` match literally (no LIKE escaping). SQLite's lower() folds ASCII only.
 */
export function containsText(column: AnyColumn, q: string): SQL {
  return sql`instr(lower(${column}), lower(${q})) > 0`;
}
