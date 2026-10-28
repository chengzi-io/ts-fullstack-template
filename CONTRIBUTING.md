# Contributing

This project is a TypeScript full-stack monorepo template: Vite + React,
Hono + tRPC, Drizzle + libSQL.

## Prerequisites

- **Node** — the version in [`.nvmrc`](./.nvmrc) (22)
- **pnpm** — the version pinned by `packageManager` in
  [`package.json`](./package.json), enabled through `corepack enable`

## Setup

```bash
pnpm install
cp packages/db/.env.example packages/db/.env   # DATABASE_URL=file:../../local.db
pnpm db:push
pnpm dev
```

Web is served by Vite; the API runs from `apps/server` on port 3000 under
`/trpc/*`.

## Gates

Every change passes all of these locally. CI runs the same set and also fails
when the working tree is dirty after the run (stray databases, generated files,
demo migrations).

```bash
pnpm check       # Biome / Ultracite lint + format (pnpm fix to autofix)
pnpm typecheck   # workspace types
pnpm test        # package tests (Vitest)
pnpm build       # production build
```

Run `pnpm fix` before committing; the `lefthook` pre-commit hook runs it too.

## Workflow

**GitHub Flow**: branch off `main`, open a PR, merge, delete the branch. Never
commit or push directly to `main`.

Branch names are `<type>/<description>` with `feat/`, `fix/`, or `chore/`,
lowercase kebab-case, 2–5 words, issue number when there is one
(`feat/issue-123-add-oauth`).

Commits follow **Conventional Commits**:

```text
<type>(<scope>): <imperative summary>
```

The type matches the branch (also `refactor`, `perf`, `docs`, `test`, `build`,
`ci`, `style`, `revert`); scope is optional. The summary is lowercase,
imperative ("add", not "added"), 72 characters at most. Breaking changes use
`type(scope)!:` plus a `BREAKING CHANGE:` footer.

`.commitlintrc.yaml` defines the rules and the `commit-msg` hook runs
`commitlint` on every message, so a non-conforming commit is rejected locally
(CI does not re-check commits: the PR title is the one that ships).

## Pull requests

- One concern per PR — split unrelated changes.
- The **PR title** must be a Conventional Commit too: `Validate PR title`
  (`.github/workflows/pr-title.yml`) checks it against the same type list, and
  a squash merge turns it into the commit on `main`. Lowercase subject.
- Fill in the PR template: what changed, why, and the checklist.
- New behavior ships with tests; a bug fix starts with a failing test.
- Contract changes stay additive — see the **Contract changes** section of
  [`AGENTS.md`](./AGENTS.md).
- Update docs and any `AGENTS.md` whose rules your change affects.

## Rules for humans and agents

[`AGENTS.md`](./AGENTS.md) and the per-package `AGENTS.md` files are the rules
for people and AI agents alike — AI-assisted PRs are welcome and held to the
same gates. Read the root file and the `AGENTS.md` of every package you touch
instead of relying on a summary here.

## Releases

Releases come from the **release-please Release PR**. Merging a Conventional
Commit into `main` makes `.github/workflows/release.yml` open or update a PR
that bumps the version, writes `CHANGELOG.md`, and tags the merge. Nothing is
published to a registry — the template is private and has no package to ship.
Merging the Release PR is the release; do not bump versions or write the
changelog by hand.

## Dependency audits

- **PRs**: `.github/workflows/dependency-review.yml` fails a PR that *adds* a
dependency with a high or critical advisory (needs a public repo or GitHub
Advanced Security).
- **Weekly**: `.github/workflows/audit.yml` runs `pnpm audit --prod` on a
schedule. It is a reminder, never a PR gate — fix the finding with a bump.

## Maintainer setup

One-time repository settings the workflows depend on:

1. **GitHub App** for releases: create one with the webhook disabled and
   `Contents: read and write` + `Pull requests: read and write`, install it on
   this repository, then set the repository variable
   `RELEASE_APP_CLIENT_ID` (the App's client ID) and the secret
   `RELEASE_APP_PRIVATE_KEY` (a generated private key). The App token is what
   lets the Release PR trigger CI.
2. **Branch protection on `main`**: require a pull request, require the
   `Validate PR title` check and the CI jobs (`verify`, `e2e`), and allow
   **squash merge only** with the PR title as the commit title.
3. **Actions workflow permissions**: read-only by default (Settings → Actions →
   General); each workflow elevates only inside the job that needs it.

## Security and license

Report vulnerabilities privately per [`SECURITY.md`](./SECURITY.md), never in a
public issue. Contributions are licensed under the [MIT License](./LICENSE).
