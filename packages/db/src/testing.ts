import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { createDb, type Database } from "./index.js";

const execFileAsync = promisify(execFile);
const packageRoot = fileURLToPath(new URL("..", import.meta.url));

export interface TestDatabase {
  db: Database;
  /** Closes the client and deletes the database file (and -wal / -shm). */
  dispose: () => Promise<void>;
}

let schemaStatements: Promise<string[]> | undefined;

/**
 * DDL for the current `src/schema` — `drizzle-kit export` needs neither a
 * config file nor a connection, and the template ships no migrations.
 */
async function exportSchemaStatements(): Promise<string[]> {
  const { stdout } = await execFileAsync(
    process.execPath,
    [
      "./node_modules/drizzle-kit/bin.cjs",
      "export",
      "--dialect",
      "turso",
      "--schema",
      "./src/schema",
      "--output",
      "json",
    ],
    { cwd: packageRoot }
  );
  const result = JSON.parse(stdout) as {
    statements?: string[];
    status: string;
  };
  if (result.status !== "ok" || !result.statements) {
    throw new Error(`drizzle-kit export failed: ${stdout}`);
  }
  return result.statements;
}

/** Fresh SQLite file with the current schema; never touches `local.db`. */
export async function createTestDb(): Promise<TestDatabase> {
  schemaStatements ??= exportSchemaStatements();
  const statements = await schemaStatements;

  const directory = await mkdtemp(path.join(tmpdir(), "workspace-test-db-"));
  const db = createDb({ url: `file:${path.join(directory, "test.db")}` });
  const dispose = async () => {
    db.close();
    await rm(directory, { force: true, recursive: true });
  };

  try {
    await db.$client.batch(statements, "write");
  } catch (error) {
    await dispose();
    throw error;
  }

  return { db, dispose };
}
