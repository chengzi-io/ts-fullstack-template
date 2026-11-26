import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, expect, test } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const templateRepo = "chengzi-io/ts-fullstack-template";
const temps = [];

const git = (cwd, ...args) =>
  execFileSync(
    "git",
    ["-c", "user.name=test", "-c", "user.email=test@example.com", ...args],
    { cwd, encoding: "utf-8" }
  );

// A fresh "Use this template" copy of the working tree, with `origin` set.
function createProject(origin) {
  const dir = mkdtempSync(path.join(tmpdir(), "init-project-"));
  temps.push(dir);
  const files = git(
    root,
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard"
  )
    .split("\n")
    .filter((file) => file && existsSync(path.join(root, file)));
  for (const file of files) {
    cpSync(path.join(root, file), path.join(dir, file));
  }
  git(dir, "init", "--quiet");
  git(dir, "add", "--all");
  git(dir, "commit", "--quiet", "--message", "Initial commit");
  git(dir, "remote", "add", "origin", origin);
  return dir;
}

const initProject = (dir) =>
  spawnSync("node", ["scripts/init-project.mjs"], {
    cwd: dir,
    encoding: "utf-8",
  });

const read = (dir, file) => readFileSync(path.join(dir, file), "utf-8");

afterEach(() => {
  for (const dir of temps.splice(0)) {
    rmSync(dir, { force: true, recursive: true });
  }
});

test("makes the copy the new repository's own project", () => {
  const dir = createProject("git@github.com:acme/my-app.git");

  const result = initProject(dir);

  expect(result.stderr).toBe("");
  expect(result.status).toBe(0);
  const pkg = JSON.parse(read(dir, "package.json"));
  expect([pkg.name, pkg.version]).toStrictEqual(["my-app", "0.0.0"]);
  expect(read(dir, "LICENSE")).toContain(
    `Copyright (c) ${new Date().getFullYear()} acme`
  );
  expect(read(dir, "README.md")).toContain("https://github.com/acme/my-app");
  expect(existsSync(path.join(dir, "scripts/init-project.mjs"))).toBe(false);
  expect(existsSync(path.join(dir, "scripts/init-project.test.mjs"))).toBe(
    false
  );
  const leftovers = spawnSync(
    "git",
    ["grep", "-n", "-I", "-e", "ts-fullstack-template", "-e", "template-only"],
    { cwd: dir, encoding: "utf-8" }
  );
  expect(leftovers.stdout).toBe("");
});

test("refuses to run on the template itself", () => {
  const dir = createProject(`https://github.com/${templateRepo}.git`);

  const result = initProject(dir);

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("is the template itself");
  expect(git(dir, "status", "--porcelain")).toBe("");
});
