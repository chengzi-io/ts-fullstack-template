import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { afterEach, describe, expect, test } from "vitest";

import { containsText, createDb, isForeignKeyViolation } from "../src/index.js";
import { createTestDb } from "../src/testing.js";

const packageRoot = path.resolve(import.meta.dirname, "..");
const modulesDir = path.resolve(packageRoot, "../../modules");
const migrateScriptPath = path.join(packageRoot, "scripts/migrate.mjs");

const itemsTable = sqliteTable("items", {
  name: text().notNull(),
});

const dbClosers: (() => void)[] = [];
const tempDirs: string[] = [];
const testDbDisposers: (() => Promise<void>)[] = [];

async function createTempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

async function createTrackedTestDb() {
  const testDb = await createTestDb();
  testDbDisposers.push(testDb.dispose);
  return testDb;
}

async function hasAnyModuleSchema(): Promise<boolean> {
  if (!existsSync(modulesDir)) {
    return false;
  }
  const entries = await readdir(modulesDir, { withFileTypes: true });
  return entries.some(
    (entry) =>
      entry.isDirectory() &&
      existsSync(path.join(modulesDir, entry.name, "src/schema.ts"))
  );
}

afterEach(async () => {
  for (const close of dbClosers.splice(0)) {
    close();
  }
  await Promise.all([
    ...testDbDisposers.splice(0).map((dispose) => dispose()),
    ...tempDirs
      .splice(0)
      .map((dir) => rm(dir, { force: true, recursive: true })),
  ]);
});

describe("@workspace/db", () => {
  test("createDb enables PRAGMA foreign_keys, pings, and closes", async () => {
    const dir = await createTempDir("db-create-");
    const db = createDb({ url: `file:${path.join(dir, "app.db")}` });
    dbClosers.push(() => {
      db.close();
    });

    await expect(db.ping()).resolves.toBeUndefined();
    const result = await db.$client.execute("PRAGMA foreign_keys");
    expect(result.rows[0]?.foreign_keys).toBe(1);

    db.close();
  });

  test("createTestDb enables PRAGMA foreign_keys", async () => {
    const { db } = await createTrackedTestDb();

    const result = await db.$client.execute("PRAGMA foreign_keys");

    expect(result.rows[0]?.foreign_keys).toBe(1);
  });

  test("createTestDb creates module tables, isolates instances, and dispose deletes temp dir", async () => {
    const first = await createTestDb();
    testDbDisposers.push(first.dispose);
    const second = await createTrackedTestDb();

    const dbList = await first.db.$client.execute("PRAGMA database_list");
    const dbFile = String(dbList.rows[0]?.file ?? "");
    const tempDir = path.dirname(dbFile);
    expect(existsSync(tempDir)).toBe(true);

    const hasSchemas = await hasAnyModuleSchema();
    const tables = await first.db.$client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
    );
    expect(tables.rows.length > 0).toBe(hasSchemas);

    await first.db.$client.execute(
      "CREATE TABLE _isolation_probe (id INTEGER PRIMARY KEY)"
    );
    const secondTables = await second.db.$client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = '_isolation_probe'"
    );
    expect(secondTables.rows).toHaveLength(0);

    await first.dispose();
    expect(existsSync(tempDir)).toBe(false);
  });

  test("isForeignKeyViolation matches LibsqlError across cause chains and ignores other errors", async () => {
    const { db } = await createTrackedTestDb();
    await db.$client.executeMultiple(`
      CREATE TABLE fk_parents (id INTEGER PRIMARY KEY);
      CREATE TABLE fk_children (
        id INTEGER PRIMARY KEY,
        parent_id INTEGER NOT NULL REFERENCES fk_parents(id) ON DELETE RESTRICT
      );
      CREATE TABLE unique_items (id INTEGER PRIMARY KEY, code TEXT UNIQUE NOT NULL);
      INSERT INTO fk_parents (id) VALUES (1);
      INSERT INTO fk_children (id, parent_id) VALUES (1, 1);
      INSERT INTO unique_items (id, code) VALUES (1, 'dup');
    `);

    let missingParentError: unknown;
    try {
      await db.$client.execute(
        "INSERT INTO fk_children (id, parent_id) VALUES (2, 999)"
      );
    } catch (error) {
      missingParentError = error;
    }

    let restrictDeleteError: unknown;
    try {
      await db.$client.execute("DELETE FROM fk_parents WHERE id = 1");
    } catch (error) {
      restrictDeleteError = error;
    }

    let uniqueError: unknown;
    try {
      await db.$client.execute(
        "INSERT INTO unique_items (id, code) VALUES (2, 'dup')"
      );
    } catch (error) {
      uniqueError = error;
    }

    expect(isForeignKeyViolation(missingParentError)).toBe(true);
    expect(isForeignKeyViolation(restrictDeleteError)).toBe(true);
    expect(
      isForeignKeyViolation(
        new Error("wrapper", {
          cause: new Error("drizzle", { cause: missingParentError }),
        })
      )
    ).toBe(true);

    expect(isForeignKeyViolation(uniqueError)).toBe(false);
    expect(isForeignKeyViolation(new Error("unrelated"))).toBe(false);
    expect(isForeignKeyViolation(null)).toBe(false);
    expect(
      isForeignKeyViolation({
        code: "SQLITE_CONSTRAINT",
        message: "FOREIGN KEY constraint failed",
      })
    ).toBe(false);
  });

  test("containsText matches case-insensitively and treats % and _ literally", async () => {
    const { db } = await createTrackedTestDb();
    await db.$client.execute("CREATE TABLE items (name TEXT NOT NULL)");
    await db
      .insert(itemsTable)
      .values([
        { name: "Ada Lovelace" },
        { name: "100% pure" },
        { name: "foo_bar" },
        { name: "fooxbar" },
        { name: "plain" },
      ]);

    const caseMatches = await db
      .select()
      .from(itemsTable)
      .where(containsText(itemsTable.name, "ADA"));
    expect(caseMatches.map((row) => row.name)).toStrictEqual(["Ada Lovelace"]);

    const percentMatches = await db
      .select()
      .from(itemsTable)
      .where(containsText(itemsTable.name, "%"));
    expect(percentMatches.map((row) => row.name)).toStrictEqual(["100% pure"]);

    const underscoreMatches = await db
      .select()
      .from(itemsTable)
      .where(containsText(itemsTable.name, "foo_bar"));
    expect(underscoreMatches.map((row) => row.name)).toStrictEqual(["foo_bar"]);
  });

  test("migrate script fails loud with actionable message when _journal.json is absent", async () => {
    const dir = await createTempDir("db-migrate-missing-");
    const scriptCopy = path.join(dir, "scripts/migrate.mjs");
    await mkdir(path.dirname(scriptCopy), { recursive: true });
    await copyFile(migrateScriptPath, scriptCopy);

    const result = spawnSync(process.execPath, [scriptCopy], {
      cwd: dir,
      encoding: "utf-8",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("packages/db/drizzle/");
    expect(result.stderr).toContain("pnpm db:push");
    expect(result.stderr).toContain("pnpm db:generate");
  });

  test("migrate script invokes drizzle-kit and propagates its exit code when _journal.json exists", async () => {
    const dir = await createTempDir("db-migrate-present-");
    const scriptCopy = path.join(dir, "scripts/migrate.mjs");
    const journalCopy = path.join(dir, "drizzle/meta/_journal.json");
    const drizzleKitStub = path.join(dir, "node_modules/drizzle-kit/bin.cjs");

    await mkdir(path.dirname(scriptCopy), { recursive: true });
    await mkdir(path.dirname(journalCopy), { recursive: true });
    await mkdir(path.dirname(drizzleKitStub), { recursive: true });

    await copyFile(migrateScriptPath, scriptCopy);
    await writeFile(journalCopy, JSON.stringify({ entries: [] }));
    await writeFile(
      drizzleKitStub,
      "process.stdout.write(JSON.stringify(process.argv.slice(2))); process.exitCode = 42;\n"
    );

    const result = spawnSync(process.execPath, [scriptCopy], {
      cwd: dir,
      encoding: "utf-8",
    });

    expect(result.stderr).toBe("");
    expect(result.stdout).toBe('["migrate"]');
    expect(result.status).toBe(42);
  });
});
