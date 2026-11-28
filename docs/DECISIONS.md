# Architecture decisions

Rationale behind template choices. When changing a decision, update its entry with what replaced it instead of leaving stale reasoning.

## 1. One module per business capability

- **Decision:** `modules/<domain>` holds contract, schema, repo, router, and tests; `apps/web/src/features/<domain>` holds its UI. `packages/kernel`, `db`, `api`, and `ui` are shared plumbing.
- **Why:** Layer-first packages (domain / db / api) forced every change across four packages, re-ran all package tests, and funnelled parallel work through shared registries. Capability modules limit test re-runs to the changed module and its dependents, and adding one touches only two shared files (`packages/api/src/index.ts`, nav).
- **Consequences:** Constraints outside the package graph are enforced in `oxlint.config.mts` (browser-safe contracts, repo-only routers, no cross-module routers, web imports). Package export conditions were tested to block browser imports of `./router` in `tsc`, but broke `AppRouter` type inference in `apps/web`, so lint enforces it instead.
- **Rejected:** Separate contract and server packages per module (doubles package count for the same guarantee).

## 2. Constraints decide; repos throw domain errors

- **Decision:** Repos write directly and translate DB constraint failures into `NotFoundError`, `ConflictError`, or `InvalidReferenceError`; kernel middleware maps them to tRPC codes. Routers contain no error handling.
- **Why:** Check-then-write races under concurrency (surfacing as 500s), and ad-hoc return conventions (`null`, `boolean`, unions) diverged across endpoints.

## 3. One contract path: tRPC

No parallel REST endpoints for domain operations. Contract evolution follows root `AGENTS.md` (additive changes; deploy server before web).

## 4. No auth in the template

`protectedProcedure` provides the seam. Products choose session / JWT / OAuth / RBAC and add matching CSRF protection and credentialed CORS.

## 5. No demo migrations

The demo uses `pnpm db:push`. Products run `pnpm db:generate` once their schema stabilizes and execute `pnpm db:migrate` before starting new replicas (never on boot, to avoid migration races). Backups, restore, and rollback belong to the product.

## 6. Testing Trophy, and demo ships with tests

Prefer integration tests (module routers via `createTestContext()`, host via `app.request()`, web pages via `renderApp()` + MSW), unit tests for pure logic, and E2E only for critical flows. Demo tests are included because AI agents copy nearby patterns — including tests — and are removed alongside the demo.

## 7. Every mutation invalidates all queries

Any successful mutation invalidates all queries (active ones refetch). Features never couple to each other's cache keys, at the cost of a few extra refetches.

## 8. Server-paged lists with URL state

Offset paging (`page` / `pageSize` / `total`) plus server-side `q` search stored in route search params. Fits admin tables; deep feeds should move to cursor paging. Tables never sort or filter a single page client-side.

## 9. Probes: `/healthz` and `/readyz`

Liveness checks the process only. Readiness returns 503 while draining shutdown or when `db.ping()` fails (cause logged). No `/health` alias.

## 10. File database requires explicit single-instance opt-in

Production rejects a `file:` `DATABASE_URL` unless `DATABASE_SINGLE_INSTANCE=true`, preventing multiple replicas from writing separate SQLite files.

## 11. Integer ids (acknowledged)

Demo tables use autoincrement integers. They are enumerable and collide across merged databases; public-facing or multi-region products should use UUIDv7.

## 12. Opt-in OTLP tracing; request id stays the cross-tier key

- **Decision:** Tracing activates only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set: `@hono/otel` creates one span per request, a pino `mixin` attaches `trace_id` / `span_id`, and shutdown flushes spans. The web sends no trace context; support correlates via `X-Request-Id`.
- **Why:** Vendor-neutral with zero overhead when unused. OTel auto-instrumentation relies on loader hooks that silently no-op in the server's ESM bundle.
- **Deferred:** Per-procedure spans, metrics.

## 13. Single error-reporting seam on the web

Failed queries, failed mutations, and route crashes all pass once through `reportError` (`apps/web/src/lib/report-error.ts`) with the request id. Plug an error tracker in there while features show expected errors inline. The API marks kernel domain errors (`NotFoundError`, `ConflictError`, `InvalidReferenceError`) with `data.expected` so the query cache skips reporting them; validation errors stay unmarked because the web sending invalid input is a bug.

## 14. One E2E test covering the critical flow

Playwright runs the built server on a fresh temp DB against `vite preview`: create an author, create a post for them, verify the post renders. `axe-core` checks WCAG 2.1 A/AA at each step in a real browser where contrast and computed names exist (jsdom computes no styles). Runs as `pnpm e2e` and a CI job, never cached by Turbo; broader coverage stays in faster integration tests.

## 15. PR dependency audit blocks only newly introduced advisories

`dependency-review.yml` fails a PR only on advisories it adds. Existing lockfile advisories are handled by Dependabot alerts and security PRs. Failing PRs on the whole tree would block every unrelated PR whenever a new CVE drops, and a scheduled `pnpm audit` duplicates Dependabot without opening fix PRs.

## 16. Releases from Conventional Commits via `git-cliff`

- **Decision:** Validated PR titles become squash commits; `git-cliff` (`.github/workflows/release.yml`, `cliff.toml`) builds draft GitHub Releases via `workflow_dispatch` (auto-bump or explicit tag) or pushed `v*` tags. No `CHANGELOG.md` is committed, root `package.json` stays `0.0.0`, and `scripts/init-project.mjs` runs offline with Node and Git only (no `gh`, no `CODEOWNERS`).
- **Why:** Replaced `release-please`, whose bot Release PRs on a protected `main` required every template clone to create and install a GitHub App just to trigger CI and re-ran full CI/E2E on every merge. Tag/dispatch releases work out of the box with `GITHUB_TOKEN` and zero secrets, and `main` stays directly usable for "Use this template".

## 17. Drizzle stays on its stable release line

- **Decision:** `drizzle-orm` and `drizzle-kit` stay pinned to npm `latest` (`0.45.x` / `0.31.x`), not the 1.0 RC.
- **Why:** A template should not hand products a pre-release when nothing requires it — schema, queries, `drizzle({ client })`, `dialect: "turso"`, and `push`/`generate`/`migrate`/`check`/`export` all work on stable.
- **Consequences:** `createTestDb()` executes SQL from `drizzle-kit export --sql` (RC's `--output json` is absent). `drizzle.config.ts` omits `strict: true` because stable prompts on every push and breaks non-TTY runs (`pnpm e2e`, CI); destructive pushes still prompt. Migrations use `drizzle/meta/_journal.json`. Upgrading to Drizzle 1.0 later will be an explicit migration (relational queries v2, new migration layout), not a routine bump.

## 18. Oxlint + Oxfmt (with `@shadcn/lint`) over Biome

- **Decision:** Ultracite drives `oxlint` + `oxfmt` (`oxlint.config.mts` / `oxfmt.config.mts`) with `@shadcn/lint`, replacing Biome as the single lint/format toolchain.
- **Why:** `@shadcn/lint` reads the Tailwind v4 theme and `@workspace/ui` primitives to flag raw colors, non-layout arbitrary values, and primitive restyling (`no-restyle`) with token/variant suggestions for AI edits. Biome lacks a JS-plugin equivalent, and running two linters duplicates setup.
- **Consequences:** `oxfmt` is pre-1.0 (`0.80.x`), pinned exact and grouped with `oxlint`, `@shadcn/lint`, and `ultracite` in Dependabot (a dev formatter carries no runtime or migration risk). Biome-specific sorting rules (JSX props, interface members, object keys) were dropped; `oxfmt` adds import, `package.json`, and Tailwind class sorting.

## Not decided yet (add when needed)

- Multi-origin or credentialed CORS; per-API CORP
- Unified patch schema instead of create/update pairs
- Drizzle relational queries (passing schema to client)
- Rate limiting (needs shared store across instances)
- Metrics

## Out of scope

Auth implementations; audit log, event bus, job queue; cloud/orchestration/proxy specifics (`apps/server/Dockerfile` is platform-neutral only); rate-limit thresholds without traffic targets.
