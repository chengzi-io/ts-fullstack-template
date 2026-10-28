#!/usr/bin/env node
// Registers the GitHub App that release-please runs as
// (.github/workflows/release.yml) and stores its credentials on the repo:
// variable RELEASE_APP_CLIENT_ID, secret RELEASE_APP_PRIVATE_KEY.
//
//   node scripts/github/create-release-app.mjs [owner/repo]
//
// Uses GitHub's App manifest flow: your browser opens a prefilled "Create
// GitHub App" page; after you confirm, GitHub redirects back here and the
// private key goes straight into the repository secret (never printed or
// written to disk). Needs `gh` logged in with rights to set Actions
// variables and secrets on the repo.
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";

function gh(args, input) {
  const result = spawnSync("gh", args, { encoding: "utf8", input });
  if (result.status !== 0) {
    throw new Error(`gh ${args.join(" ")} failed:\n${result.stderr}`);
  }
  return result.stdout.trim();
}

const repo =
  process.argv[2] ??
  gh(["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]);
const [owner, name] = repo.split("/");
const ownerType = gh(["api", `repos/${repo}`, "--jq", ".owner.type"]);
const newAppUrl =
  ownerType === "Organization"
    ? `https://github.com/organizations/${owner}/settings/apps/new`
    : "https://github.com/settings/apps/new";

const state = randomBytes(16).toString("hex");
const server = createServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const manifest = {
  default_events: [],
  // release-please writes the changelog and tags (contents), opens the
  // Release PR (pull requests), and labels it (issues).
  default_permissions: {
    contents: "write",
    issues: "write",
    pull_requests: "write",
  },
  hook_attributes: { active: false, url: `https://github.com/${repo}` },
  name: `${name}-release`,
  public: false,
  redirect_url: `${base}/callback`,
  url: `https://github.com/${repo}`,
};

const escapeHtml = (text) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");

const done = new Promise((resolve, reject) => {
  server.on("request", (req, res) => {
    const url = new URL(req.url, base);
    if (url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(`<!doctype html><form method="post" action="${newAppUrl}?state=${state}">
<input type="hidden" name="manifest" value="${escapeHtml(JSON.stringify(manifest))}">
<p>Creating the release App for ${escapeHtml(repo)}…</p><button>Continue to GitHub</button></form>
<script>document.forms[0].submit()</script>`);
      return;
    }
    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      if (url.searchParams.get("state") !== state || !code) {
        res.writeHead(400).end("State mismatch or missing code.");
        reject(new Error("Callback without a matching state or a code."));
        return;
      }
      res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      res.end("App created. Return to the terminal.");
      resolve(code);
      return;
    }
    res.writeHead(404).end();
  });
});

console.log(`Open ${base}/ to create the App (opening it for you).`);
const opener =
  { darwin: "open", win32: "explorer" }[process.platform] ?? "xdg-open";
spawnSync(opener, [`${base}/`]);

let code;
try {
  code = await done;
} finally {
  server.close();
}

// The conversion endpoint needs no token; the code itself is the proof.
const response = await fetch(
  `https://api.github.com/app-manifests/${code}/conversions`,
  {
    headers: {
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
    },
    method: "POST",
  }
);
if (!response.ok) {
  throw new Error(
    `Manifest conversion failed: ${response.status} ${await response.text()}`
  );
}
const app = await response.json();

gh([
  "variable",
  "set",
  "RELEASE_APP_CLIENT_ID",
  "--repo",
  repo,
  "--body",
  app.client_id,
]);
gh(["secret", "set", "RELEASE_APP_PRIVATE_KEY", "--repo", repo], app.pem);

console.log(
  `Created ${app.html_url} and stored its client id and private key on ${repo}.`
);
console.log(`Last step — install it on the repository:
  https://github.com/apps/${app.slug}/installations/new`);
