#!/usr/bin/env node
// Creates the gitignored local .env files this repo needs, from the
// checked-in templates next to them:
//
//   node scripts/setup-local.mjs [root]
//
// root defaults to the current directory, so the script can run against a
// temporary tree in tests. An existing .env is never overwritten — customize
// yours and re-run as often as you like.
import { constants, copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// The .env files the gitignored local setup owns; each has an .env.example.
const envFiles = ["packages/db/.env", "apps/server/.env"];

/**
 * @returns One entry per .env file, saying whether it was created or skipped.
 */
export function setupLocalEnv(rootDir) {
  return envFiles.map((file) => {
    const source = `${file}.example`;
    const sourcePath = path.join(rootDir, source);
    const targetPath = path.join(rootDir, file);

    if (!existsSync(sourcePath)) {
      throw new Error(`Missing template: ${sourcePath}`);
    }
    if (existsSync(targetPath)) {
      return { file, status: "skipped" };
    }
    // COPYFILE_EXCL: a concurrent run cannot clobber a .env that appeared
    // between the check above and this copy.
    copyFileSync(sourcePath, targetPath, constants.COPYFILE_EXCL);
    return { file, status: "created" };
  });
}

// Only run as a CLI, so importing the helper for tests has no side effects.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const rootDir = path.resolve(process.argv[2] ?? process.cwd());
  for (const { file, status } of setupLocalEnv(rootDir)) {
    const detail = status === "created" ? "" : " (already exists)";
    console.log(`${status}: ${file}${detail}`);
  }
}
