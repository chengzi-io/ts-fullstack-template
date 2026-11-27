<!-- intent-skills:start -->

## Skill Loading

Before editing files for a substantial task:

- Run `pnpm exec intent list` from the workspace root to list local skills.
- If a skill matches, run `pnpm exec intent load <package>#<skill>` and follow its `SKILL.md` guidance.
- Prefer the most specific skill for the package or concern; load extras only when a task spans multiple areas.
- If `intent` is unavailable or nothing matches, follow the relevant package `AGENTS.md` and source files.

<!-- intent-skills:end -->

# Workspace guide

Workspace-wide layout, dependency rules, quality gates, and shared conventions. Package-specific rules live in each app/package `AGENTS.md`.

## Layout & dependencies

One business capability = one directory: `modules/<domain>` owns it on the server, and `apps/web/src/features/<domain>` owns its UI.

```text
modules/<domain>    one capability (demo: authors, posts) — see modules/AGENTS.md
  src/contract.ts   Zod + types, browser-safe (imported by web)
  src/schema.ts     Drizzle tables
  src/repo.ts       only code touching those tables
  src/router.ts     tRPC procedures, repo on ctx.<domain>
  test/             router tests on temp SQLite
packages/kernel     module SDK: procedures, error mapping, context, errors, pagination, test ctx
packages/db         createDb, Executor, FK helper, createTestDb, drizzle config & migrations
packages/api        composition only: appRouter (one line per module) + AppRouter types
packages/ui         shared UI primitives
apps/server         HTTP host: env, createDb, mount appRouter
apps/web            SPA: features/<domain> mirrors modules/<domain>
```

Allowed package dependencies:

```text
apps/web        -> @workspace/api (types), modules/*/contract, packages/kernel/pagination, packages/ui
apps/server     -> @workspace/api, packages/kernel, packages/db
packages/api    -> modules/*
modules/*       -> packages/kernel, packages/db, other modules (one-way, declared in package.json)
packages/kernel -> packages/db
```

### Enforced boundaries

| Rule | Enforced by |
| --- | --- |
| Module dependencies are one-way (`posts` → `authors`) | pnpm (resolves only declared deps in `package.json`) |
| Modules never import another module's `router` or `@workspace/api` | Oxlint (`oxlint.config.mts`) |
| `contract.ts` stays browser-safe; `router.ts` accesses data only via its repo | Oxlint |
| `apps/web` imports only module contracts, `kernel/pagination`, `@workspace/ui`, and `AppRouter` types | Oxlint |
| Web features reach each other only via `api.ts` or `store.ts` | Oxlint |
| UI uses theme tokens and primitive variants (no raw colors, arbitrary non-layout values, or restyled primitives) | Oxlint (`@shadcn/lint`) |

## Workflow & quality gates

- **Add a module:** copy `modules/authors` (`package.json`, tsconfigs, `src/`, `test/`), register it in `packages/api` (dep + `appRouter` line) and, if it has UI, in `apps/web` (dep + `features/<name>/` + route + nav link). Drizzle config and `createTestDb()` auto-discover `modules/*/src/schema.ts`.
- **Quality gates:** `pnpm typecheck`, `pnpm check` (`pnpm fix` to autofix), `pnpm test`. CI (`.github/workflows/ci.yml`) runs these plus `pnpm build` and fails on a dirty tree.
- **Commits & PR titles:** `commitlint` (`.commitlintrc.yaml`, `commit-msg` hook) checks commits; `.github/workflows/pr-title.yml` checks PR titles against the same Conventional Commit rules because PR titles become squash commits.
- **Database:** use `pnpm db:push` for demo and early iteration; switch to migrations once the product schema stabilizes.
- **Git worktrees:** never run `lefthook install` in a secondary worktree; hooks live in shared `.git/hooks` and would overwrite the primary checkout's hooks.

## Contract changes

Web and server deploy independently and tRPC is unversioned, so old web bundles call the new server during rolling deploys:

- Ship only additive changes per release: new procedures, new optional input fields, new output fields.
- Deploy server before web.
- Remove or rename fields across two releases: stop using them in web first, then remove them from server.
- Never tighten input validation in the same release as the web change.

## Code style

Oxlint + Oxfmt (Ultracite presets + `@shadcn/lint`) handle formatting and lint; run `pnpm fix` before committing (lefthook also runs it). Conventions tools cannot check:

- **Fail loud:** no empty `catch` or `?? default` masking failures; propagate or log the root cause (`rootCause` from `@workspace/kernel/errors`).
- **Accurate names:** match actual scope (`PostDialog` handles create and edit, not `CreatePostDialog`).
- **Minimal comments:** explain only non-obvious decisions, workarounds (with reason), or invariants.
- **Business rules in modules:** keep domain rules in module repos and routers, never in the server host or web.
- **Accessibility:** every dialog needs a title, icon buttons need accessible labels, and forms use `Field` primitives.

## Testing

- **Strategy (Testing Trophy):** prefer integration tests — module routers via `createTestContext()`, host via `app.request()`, web pages via `renderApp()` with MSW `trpc()`. Use unit tests for pure logic and E2E only for critical flows.
- **Isolation:** use temp SQLite (`createTestDb()` / `createTestContext()`), never `local.db` or remote DBs. Mock only at network or process boundaries, never workspace packages.
- **Discipline:** bug fixes start with a failing test; new behavior ships with tests. Never weaken/delete assertions or add `.only`/`.skip` to pass. Keep suites flat, assert inside `test()`, and use `async`/`await` (no `done` callbacks).
- **Demo tests:** demo code ships with its tests as a reference and is removed with them (`docs/REMOVE-DEMO.md`).
- **Running:** Vitest runs `<pkg>/test/*.test.ts` (`*.test.tsx` in `apps/web`) and `scripts/*.test.mjs`; import `describe`, `test`, `expect` explicitly from `vitest` (no globals). Run `pnpm test` (Turbo-cached) or `pnpm exec vitest related <files> --run` inside a package.
- **E2E:** `pnpm e2e` builds and runs Playwright (`apps/web/e2e/*.e2e.ts`) against its own temp DB, `apps/server`, and `vite preview` (leave no dev server running). Install Chromium once per machine: `pnpm --filter web exec playwright install chromium`.

Architecture rationale: `docs/DECISIONS.md`.
