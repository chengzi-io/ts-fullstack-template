import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, expect, test } from "vitest";

const script = path.join(import.meta.dirname, "setup-local.mjs");
const envFiles = ["packages/db/.env", "apps/server/.env"];
const temps = [];

// A temp root holding only the checked-in templates, so the real workspace
// .env files are never touched.
function createRoot(templates = envFiles) {
  const root = mkdtempSync(path.join(tmpdir(), "setup-local-"));
  temps.push(root);
  for (const file of templates) {
    const templatePath = path.join(root, `${file}.example`);
    mkdirSync(path.dirname(templatePath), { recursive: true });
    writeFileSync(templatePath, `# ${file} template\n`);
  }
  return root;
}

const setup = (root) =>
  spawnSync(process.execPath, [script, root], { encoding: "utf-8" });

const read = (root, file) => readFileSync(path.join(root, file), "utf-8");

afterEach(() => {
  for (const root of temps.splice(0)) {
    rmSync(root, { force: true, recursive: true });
  }
});

test("creates every .env from its template", () => {
  const root = createRoot();

  const result = setup(root);

  expect(result.stderr).toBe("");
  expect(result.status).toBe(0);
  for (const file of envFiles) {
    expect(read(root, file)).toBe(read(root, `${file}.example`));
    expect(result.stdout).toContain(`created: ${file}`);
  }
});

test("keeps an existing .env and reports it as skipped", () => {
  const root = createRoot();
  setup(root);
  writeFileSync(
    path.join(root, "packages/db/.env"),
    "DATABASE_URL=file:mine\n"
  );

  const result = setup(root);

  expect(result.status).toBe(0);
  expect(read(root, "packages/db/.env")).toBe("DATABASE_URL=file:mine\n");
  expect(result.stdout).toContain("skipped: packages/db/.env (already exists)");
  expect(result.stdout).toContain("skipped: apps/server/.env (already exists)");
});

test("fails when a template is missing", () => {
  const root = createRoot(["apps/server/.env"]);

  const result = setup(root);

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain(path.join(root, "packages/db/.env.example"));
  expect(existsSync(path.join(root, "apps/server/.env"))).toBe(false);
});
