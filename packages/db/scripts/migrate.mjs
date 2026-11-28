import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const defaultPackageRoot = path.resolve(import.meta.dirname, "..");
const JOURNAL_RELATIVE_PATH = path.join("drizzle", "meta", "_journal.json");

/**
 * Preflight guard for `pnpm db:migrate` (ADR #5: the template ships no demo
 * migrations, so fail loud with instructions before invoking drizzle-kit).
 */
export function runMigrate({
  args = [],
  packageRoot = defaultPackageRoot,
  stderr = process.stderr,
} = {}) {
  const journalPath = path.join(packageRoot, JOURNAL_RELATIVE_PATH);
  if (!existsSync(journalPath)) {
    stderr.write(
      [
        "No migrations exist yet in packages/db/drizzle/ (missing drizzle/meta/_journal.json).",
        "The demo uses `pnpm db:push`; once your schema stabilizes, run `pnpm db:generate` before `pnpm db:migrate`.",
        "",
      ].join("\n")
    );
    return 1;
  }

  const result = spawnSync(
    process.execPath,
    ["./node_modules/drizzle-kit/bin.cjs", "migrate", ...args],
    {
      cwd: packageRoot,
      stdio: "inherit",
    }
  );
  if (result.error) {
    stderr.write(`${result.error.message}\n`);
    return 1;
  }
  return result.status ?? 1;
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === import.meta.filename;

if (isDirectExecution) {
  process.exitCode = runMigrate({ args: process.argv.slice(2) });
}
