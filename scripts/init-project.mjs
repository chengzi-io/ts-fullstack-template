#!/usr/bin/env node
// Makes a repository created with "Use this template" your own project. Run
// it once, from the root of the fresh clone:
//
//   node scripts/init-project.mjs [owner/repo]
//
// owner/repo defaults to the `origin` remote. Names the package after the
// repository, resets the release state (version 0.0.0, no CHANGELOG.md),
// points LICENSE, CODEOWNERS, README.md and the .github templates at the new
// repository, drops the README parts that only describe the template, then
// deletes itself. Review the diff and commit it. Needs `gh` logged in:
// CODEOWNERS gets your GitHub login.
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const templateRepo = "chengzi-io/ts-fullstack-template";
const [, templateName] = templateRepo.split("/");
const self = "scripts/init-project.mjs";

// https://github.com/o/r.git, git@github.com:o/r.git, and SSH host aliases.
const remoteRepo = /[:/]([^/:]+)\/([^/]+?)(?:\.git)?\/?$/;
const copyrightLine = /^Copyright \(c\) .*$/gm;
const templateOnly =
  /<!-- template-only -->[\s\S]*?<!-- \/template-only -->\n+/g;

const run = (command, args) =>
  execFileSync(command, args, { encoding: "utf8" }).trim();

// Every replacement must land: a pattern that no longer matches means the
// template changed under this script.
function edit(file, ...replacements) {
  let text = readFileSync(file, "utf8");
  for (const [pattern, replacement] of replacements) {
    const next = text.replaceAll(pattern, replacement);
    if (next === text) {
      throw new Error(`${file}: nothing matches ${pattern}`);
    }
    text = next;
  }
  writeFileSync(file, text);
}

function originRepo() {
  const url = run("git", ["remote", "get-url", "origin"]);
  const match = url.match(remoteRepo);
  if (!match) {
    throw new Error(`Cannot read owner/repo from the origin remote: ${url}`);
  }
  return `${match[1]}/${match[2]}`;
}

const repo = process.argv[2] ?? originRepo();
const [owner, name] = repo.split("/");
if (!(owner && name)) {
  throw new Error(`Expected owner/repo, got: ${repo}`);
}
if (repo === templateRepo) {
  throw new Error(
    `${repo} is the template itself; run this in a repository created from it.`
  );
}
const login = run("gh", ["api", "user", "--jq", ".login"]);
const { version: templateVersion } = JSON.parse(
  readFileSync("package.json", "utf8")
);

edit(
  "package.json",
  [`"name": "${templateName}"`, `"name": "${name.toLowerCase()}"`],
  [`"version": "${templateVersion}"`, '"version": "0.0.0"']
);
// 0.0.0 tells release-please nothing was released yet; the template's own
// changelog is not this project's history.
writeFileSync(".release-please-manifest.json", '{\n  ".": "0.0.0"\n}\n');
rmSync("CHANGELOG.md", { force: true });

edit("LICENSE", [
  copyrightLine,
  `Copyright (c) ${new Date().getFullYear()} ${owner}`,
]);
writeFileSync(".github/CODEOWNERS", `* @${login}\n`);
edit(
  "README.md",
  [templateOnly, ""],
  [templateRepo, repo],
  [templateName, name]
);

// Links in the .github templates (security policy, AGENTS.md) and anything
// added later that names the template repository.
const grep = spawnSync(
  "git",
  ["grep", "-l", "-F", templateRepo, "--", ".", `:!${self}`],
  { encoding: "utf8" }
);
if (grep.status > 1) {
  throw new Error(`git grep failed:\n${grep.stderr}`);
}
for (const file of grep.stdout.split("\n").filter(Boolean)) {
  edit(file, [templateRepo, repo]);
}

rmSync(fileURLToPath(import.meta.url));

console.log(`${repo} is set up from ${templateRepo} v${templateVersion}.

Next:
  1. Review the changes, then commit and push them:
       git add -A
       git commit -m "chore: start from ${templateName} v${templateVersion}"
  2. Set up GitHub once, as a repository admin (CONTRIBUTING.md, "Maintainer setup"):
       node scripts/github/create-release-app.mjs
       scripts/github/setup-repo.sh
  3. LICENSE is MIT, held by ${owner}; replace it if you need another license.
  4. When the demo has served its purpose: docs/REMOVE-DEMO.md`);
