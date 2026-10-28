import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const templateRepo = "chengzi-io/ts-fullstack-template";
// "version" in package.json, "." in the release-please manifest.
const versionField = /("(?:version|\.)": )"[^"]+"/;
const temps = [];

const git = (cwd, ...args) =>
  execFileSync(
    "git",
    ["-c", "user.name=test", "-c", "user.email=test@example.com", ...args],
    { cwd, encoding: "utf8" }
  );

// A fresh "Use this template" copy of the working tree, with `origin` set.
function createProject(origin, { released = false } = {}) {
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
  if (released) {
    for (const file of ["package.json", ".release-please-manifest.json"]) {
      const text = readFileSync(path.join(dir, file), "utf8");
      writeFileSync(
        path.join(dir, file),
        text.replace(versionField, '$1"0.1.0"')
      );
    }
    writeFileSync(
      path.join(dir, "CHANGELOG.md"),
      `# Changelog\n\n## [0.1.0](https://github.com/${templateRepo}/compare/v0.0.0...v0.1.0)\n`
    );
  }
  git(dir, "init", "--quiet");
  git(dir, "add", "--all");
  git(dir, "commit", "--quiet", "--message", "Initial commit");
  git(dir, "remote", "add", "origin", origin);
  return dir;
}

// The script asks `gh` for the login that owns CODEOWNERS.
function initProject(dir) {
  const bin = path.join(dir, ".test-bin");
  mkdirSync(bin);
  writeFileSync(path.join(bin, "gh"), "#!/bin/sh\necho octocat\n");
  chmodSync(path.join(bin, "gh"), 0o755);
  const result = spawnSync("node", ["scripts/init-project.mjs"], {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` },
  });
  rmSync(bin, { recursive: true });
  return result;
}

const read = (dir, file) => readFileSync(path.join(dir, file), "utf8");

afterEach(() => {
  for (const dir of temps.splice(0)) {
    rmSync(dir, { force: true, recursive: true });
  }
});

it.each([
  ["an unreleased template", false],
  ["a released template", true],
])("makes %s the new repository's own project", (_, released) => {
  const dir = createProject("git@github.com:acme/my-app.git", { released });

  const result = initProject(dir);

  expect(result.stderr).toBe("");
  expect(result.status).toBe(0);
  const pkg = JSON.parse(read(dir, "package.json"));
  expect([pkg.name, pkg.version]).toEqual(["my-app", "0.0.0"]);
  expect(JSON.parse(read(dir, ".release-please-manifest.json"))).toEqual({
    ".": "0.0.0",
  });
  expect(existsSync(path.join(dir, "CHANGELOG.md"))).toBe(false);
  expect(read(dir, "LICENSE")).toContain(
    `Copyright (c) ${new Date().getFullYear()} acme`
  );
  expect(read(dir, ".github/CODEOWNERS")).toBe("* @octocat\n");
  expect(read(dir, "README.md")).toContain("https://github.com/acme/my-app");
  expect(existsSync(path.join(dir, "scripts/init-project.mjs"))).toBe(false);
  expect(existsSync(path.join(dir, "scripts/init-project.test.mjs"))).toBe(
    false
  );
  const leftovers = spawnSync(
    "git",
    ["grep", "-n", "-I", "-e", "ts-fullstack-template", "-e", "template-only"],
    { cwd: dir, encoding: "utf8" }
  );
  expect(leftovers.stdout).toBe("");
});

it("refuses to run on the template itself", () => {
  const dir = createProject(`https://github.com/${templateRepo}.git`);

  const result = initProject(dir);

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("is the template itself");
  expect(git(dir, "status", "--porcelain")).toBe("");
});
