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

## Pull requests

- One concern per PR — split unrelated changes.
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

## Security and license

Report vulnerabilities privately per [`SECURITY.md`](./SECURITY.md), never in a
public issue. Contributions are licensed under the [MIT License](./LICENSE).
