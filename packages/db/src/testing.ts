import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { createDb, type Database } from "./index.js";

const execFileAsync = promisify(execFile);
const packageRoot = fileURLToPath(new URL("..", import.meta.url));
/** Each module keeps its tables in `modules/<name>/src/schema.ts`. */
const MODULE_SCHEMAS = "../../modules/*/src/schema.ts";
const CREATE_TABLE = /\bCREATE TABLE\b/i;

export interface TestDatabase {
  db: Database;
  /** Closes the client and deletes the database file (and -wal / -shm). */
  dispose: () => Promise<void>;
}

let schemaScript: Promise<string> | undefined;

async function hasModuleSchemas(): Promise<boolean> {
  const modulesDir = path.join(packageRoot, "../../modules");
  if (!existsSync(modulesDir)) {
    return false;
  }
  const modules = await readdir(modulesDir, { withFileTypes: true });
  return modules.some(
    (entry) =>
      entry.isDirectory() &&
      existsSync(path.join(modulesDir, entry.name, "src/schema.ts"))
  );
}

/**
 * DDL script for every module's current schema — `drizzle-kit export` needs
 * neither a config file nor a connection, and the template ships no
 * migrations. With no modules (e.g. demo removed) the database is simply empty.
 */
async function exportSchemaScript(): Promise<string> {
  if (!(await hasModuleSchemas())) {
    return "";
  }
  const { stdout } = await execFileAsync(
    process.execPath,
    [
      "./node_modules/drizzle-kit/bin.cjs",
      "export",
      "--dialect",
      "turso",
      "--schema",
      MODULE_SCHEMAS,
      "--sql",
    ],
    { cwd: packageRoot }
  );
  if (!CREATE_TABLE.test(stdout)) {
    throw new Error(`drizzle-kit export printed no tables: ${stdout}`);
  }
  return stdout;
}

/** Fresh SQLite file with the current schema; never touches `local.db`. */
export async function createTestDb(): Promise<TestDatabase> {
  schemaScript ??= exportSchemaScript();
  const script = await schemaScript;

  const directory = await mkdtemp(path.join(tmpdir(), "workspace-test-db-"));
  const db = createDb({ url: `file:${path.join(directory, "test.db")}` });
  const dispose = async () => {
    db.close();
    await rm(directory, { force: true, recursive: true });
  };

  try {
    if (script) {
      await db.$client.executeMultiple(script);
    }
  } catch (error) {
    await dispose();
    throw error;
  }

  return { db, dispose };
}
