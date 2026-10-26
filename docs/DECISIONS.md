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

## Not decided yet — add when a product needs it

- CORS for several origins or with credentials; CORP tuned per API
- A fallback when `pino-pretty` fails to load in development
- One patch schema instead of create/update pairs
- Drizzle relational queries (schema passed to the client)
- Rate limiting (needs a shared store once there are several instances)
- OpenTelemetry / metrics; Playwright E2E for the critical flows
- Template versioning (tags + changelog) so derived projects can track upgrades

## Out of scope for the template

Auth implementations; audit log, event bus, job queue; cloud, container, or
reverse-proxy specifics; rate-limit numbers without real traffic targets.
