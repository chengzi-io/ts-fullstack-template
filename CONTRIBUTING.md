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
- **Backlog**: Dependabot alerts (Security tab) cover the whole lockfile, dev
dependencies included, and Dependabot security updates open the fix PRs; both
are turned on by `scripts/github/setup-repo.sh`. When a parent pins a
vulnerable transitive release and Dependabot cannot bump it, add a same-major
entry to `overrides` in `pnpm-workspace.yaml`.

## Maintainer setup

One-time repository settings the workflows depend on, scripted with `gh`
(log in as a repository admin):

1. **Release App** — `node scripts/github/create-release-app.mjs`: your browser
   opens a prefilled "Create GitHub App" page (webhook off; Contents, Issues,
   Pull requests: read and write). After you confirm, the script stores the
   variable `RELEASE_APP_CLIENT_ID` and the secret `RELEASE_APP_PRIVATE_KEY`,
   then prints the link to install the App on this repository. Its token is
   what lets the Release PR trigger CI; until the variable exists, the release
   job is skipped.
2. **Repository settings** — `scripts/github/setup-repo.sh`, as soon as the
   workflows are on `main` (dependency review fails until it has run): squash merge only with the PR title as the commit; branch
   protection requiring a PR and the `Validate PR title`, `verify`, `e2e`, and
   `dependency-review` checks; read-only Actions token; private vulnerability
   reporting, secret scanning with push protection, and Dependabot security
   updates. It prints the settings back so you can check them.

## Security and license

Report vulnerabilities privately per [`SECURITY.md`](./.github/SECURITY.md), never in a
public issue. Contributions are licensed under the [MIT License](./LICENSE).
