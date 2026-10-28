# Decisions

Why the template is shaped this way. To change one, edit its entry and say
what replaced it — don't leave the old reasoning standing.

## 1. One module per business capability

- **Decision:** `modules/<domain>` holds a capability's contract, schema,
  repo, router, and tests; `apps/web/src/features/<domain>` holds its UI.
  `packages/kernel`, `db`, `api`, and `ui` are shared plumbing.
- **Why:** layer-first packages (domain / db / api) made every change cross
  four packages, re-ran every package's tests, and pushed parallel work
  through shared registry files. Now a change to one module re-runs only its
  own and its dependents' tests, and adding one touches two shared source
  files (`packages/api/src/index.ts`, the nav).
- **Consequences:** rules the package graph cannot express are Biome rules in
  `biome.jsonc` (browser-safe contracts, routers only through repos, no
  cross-module routers, web imports). Export conditions were tried to make
  `tsc` reject browser imports of `./router` — they break `AppRouter`
  inference in the web, so the guard is lint, not module resolution.
- **Rejected:** a contract package plus a server package per module (twice
  the packages for the same guarantee).

## 2. Constraints decide; repos throw domain errors

- **Decision:** repos write and translate constraint failures into
  `NotFoundError` / `ConflictError` / `InvalidReferenceError`; one kernel
  middleware maps them to tRPC codes. Routers have no error handling.
- **Why:** look-up-then-write raced (a concurrent write surfaced as a 500),
  and three failure conventions (null, boolean, string union) were copied
  inconsistently.

## 3. One contract path: tRPC

No parallel REST endpoints for the same domain. Contract evolution rules are
in the root `AGENTS.md` (additive changes; server deploys before web).

## 4. No auth in the template

`protectedProcedure` is the seam; a product picks session / JWT / OAuth /
RBAC — and then adds CSRF protection and credentialed CORS to match.

## 5. No demo migrations

The demo uses `pnpm db:push`. A product generates its first migration once
its schema settles; deploys run `pnpm db:migrate` before starting the new
server (never on boot — replicas would race). Backups, restore, and
migration rollback belong to the product.

## 6. Testing Trophy, and the demo ships with its tests

Integration tests first (module routers via `createTestContext()`, the host
via `app.request()`, web pages via `renderApp()` + MSW), unit tests for pure
logic, E2E only for critical flows. Demo tests were once left out; that was
reversed because AI-written code copies the nearest example — tests
included. They are deleted together with the demo.

## 7. Every mutation refreshes every query

Any successful mutation invalidates all queries (active ones refetch). No
feature knows another feature's cache keys. Cost: a few extra refetches.

## 8. Lists page on the server; their state lives in the URL

`page` / `pageSize` / `total` offset paging plus a server-side `q` search,
with `page` / `pageSize` / `q` in route search params. Right for admin
tables; deep feeds should switch to cursor paging. Tables never sort or
filter a single page in the browser.

## 9. Probes: `/healthz` and `/readyz`

Liveness is process-only. Readiness answers 503 while shutdown drains or
when the database is unreachable (the cause is logged). No `/health` alias.

## 10. A file database only for a declared single instance

Production refuses a `file:` `DATABASE_URL` unless
`DATABASE_SINGLE_INSTANCE=true`: two replicas would each write their own copy.

## 11. Integer ids (acknowledged)

The demo uses autoincrement integers. They are enumerable and collide when
databases merge; a public-facing or multi-region product should use UUIDv7.

## 12. Tracing is opt-in OTLP; the request id stays the cross-tier key

- **Decision:** the server traces only when `OTEL_EXPORTER_OTLP_ENDPOINT` is
  set: `@hono/otel` middleware for one span per request, a pino `mixin` for
  `trace_id` / `span_id` on every log line, spans flushed during shutdown.
  The web sends no trace context; support correlates by request id.
- **Why:** vendor-neutral and free when unused. OTel's auto-instrumentation
  patches modules through a loader hook and silently does nothing in the
  server's ESM bundle.
- **Not yet:** per-procedure spans, metrics.

## 13. Unexpected web errors go through one seam

Failed queries and mutations and route crashes all reach `reportError`
(`apps/web/src/lib/report-error.ts`), once per error, with the request id.
An error tracker plugs in there; features keep showing expected errors inline.

## 14. One E2E test, of the critical flow

Playwright runs the built server on a fresh temp database and the built web
(`vite preview`): create an author, post for it, see the post. It is a CI job
and `pnpm e2e`, never a cached Turbo task. Everything else stays in the
faster integration tests.

## 15. Dependency audit blocks only what a PR introduces

Dependency review fails a PR only on advisories it adds. The backlog —
advisories published later for what the lockfile already holds — goes to
Dependabot alerts and security updates. A PR gate on the whole tree would
turn every open PR red the day an advisory is published, whatever the PR
changed. A scheduled `pnpm audit` would repeat the alerts with less reach:
its failures sit on the Actions page and open no fix.

## 16. Releases come from Conventional Commits

PR titles are checked and become the squash commit; release-please turns
them into a Release PR with the changelog and the next version. Derived
projects compare their base against the tags.

## Not decided yet — add when a product needs it

- CORS for several origins or with credentials; CORP tuned per API
- A fallback when `pino-pretty` fails to load in development
- One patch schema instead of create/update pairs
- Drizzle relational queries (schema passed to the client)
- Rate limiting (needs a shared store once there are several instances)
- Metrics

## Out of scope for the template

Auth implementations; audit log, event bus, job queue; cloud, container, or
reverse-proxy specifics; rate-limit numbers without real traffic targets.
