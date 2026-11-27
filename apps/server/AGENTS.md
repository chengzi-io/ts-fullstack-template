# server

Thin HTTP host: env, process lifecycle, Hono middleware, tRPC mount. No domain routers, Drizzle schema, or React. Workspace map: root `AGENTS.md`.

## Ownership & constraints

| Owns | Does not own |
| --- | --- |
| `createEnv` (t3-env) + boot wiring | Domain Zod schemas, tables, repos (`modules/<domain>`) |
| `createApp` middleware + probes | tRPC procedure logic / `appRouter` (`@workspace/api`) |
| pino logger, access log, graceful shutdown | Browser / Vite |
| Loading `packages/db/.env` for `DATABASE_*` | Drizzle migrations (`@workspace/db`) |

- Composition root (`src/index.ts`): `env` → `createDb` → `createApp({ db, log, router: appRouter })` → listen.
- tRPC context: `createTRPCContext({ db, log, requestId, session? })` from `@workspace/kernel/context`; modules build repos from `db`.
- Host uses `db` only for `ping` / `close` and probes; never import `drizzle-orm` or any module here.
- `DATABASE_*` vars belong in `packages/db/.env` (or platform env), not `apps/server/.env`. Scripts load both with `--env-file-if-exists=../../packages/db/.env --env-file-if-exists=.env`.
- Never log `DATABASE_AUTH_TOKEN`.
- Build: `tsdown` bundles `@workspace/*` and their dependencies; keep `@libsql/client` external.

## Layout

```text
src/
  index.ts                 composition root + signals
  app.ts                   Hono app factory
  env.ts                   t3-env + Zod
  lib/logger.ts            pino (trace ids, redaction)
  lib/shutdown.ts          idempotent HTTP → DB → tracing close
  lib/tracing.ts           opt-in OTLP tracing
  middleware/access-log.ts
  routes/probes.ts         /healthz · /readyz
test/
  app.ts                   createTestApp() → real app on createTestDb(), silent logger
  app.test.ts              probes · request id · error contract (test router)
  shutdown.test.ts         injected server / DB / tracing / exit / timers
  env.test.ts              fail-fast config
  logger.test.ts           redaction
  tracing.test.ts          spans, trace ids in logs, resource
tsdown.config.ts
scripts/smoke-build.mjs
```

## Middleware & endpoints

**Middleware order:** `otel` (span) → `requestId` → child logger + `X-Request-Id` → access log (skip probes) → `secureHeaders` → `bodyLimit` → optional CORS on `/trpc/*` → routes → `notFound` / `onError`.

| Path           | Role                                              |
| -------------- | ------------------------------------------------- |
| `GET /healthz` | Liveness                                          |
| `GET /readyz`  | Readiness (`db.ping()` → 503 if down or draining) |
| `/trpc/*`      | `appRouter`                                       |
| `GET /`        | ok text                                           |

## Shutdown & tracing

- **Shutdown:** SIGTERM/SIGINT (or fatal error) → `/readyz` returns 503 → wait `SHUTDOWN_DRAIN_MS` → close HTTP (in-flight requests finish) → close DB → flush/stop tracing (if enabled) → exit. Failed DB or tracing close exits 1; exceeding `SHUTDOWN_TIMEOUT_MS` force-closes sockets and exits 1 (including a stalled span flush).
- **Tracing:** Opt-in, disabled unless `OTEL_EXPORTER_OTLP_ENDPOINT` is set. When set, `startTracing` lazily loads the SDK/exporter and registers `NodeTracerProvider` + `BatchSpanProcessor` (OTLP/HTTP) before creating the app or DB; when unset, no SDK modules load. `@hono/otel` runs first, and `lib/logger.ts` adds `trace_id`, `span_id`, `trace_flags` from the active span. No auto-instrumentation (ESM `tsdown` bundle bypasses `--require`/`--import` patches). Because OTel SDK 2.x default resource ignores `OTEL_SERVICE_NAME` and `OTEL_RESOURCE_ATTRIBUTES`, `lib/tracing.ts` merges `envDetector`.

## Env

| Var | Owner | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `packages/db/.env` | required |
| `DATABASE_AUTH_TOKEN` | `packages/db/.env` | remote libSQL only |
| `PORT`, `CORS_ORIGIN`, `LOG_LEVEL`, timeouts | `apps/server/.env` | optional defaults |
| `SHUTDOWN_DRAIN_MS` | `apps/server/.env` | not-ready grace before HTTP close (match LB deregistration delay; `< SHUTDOWN_TIMEOUT_MS`) |
| `HTTP_KEEP_ALIVE_TIMEOUT_MS` | `apps/server/.env` | must exceed LB idle timeout (e.g. AWS ALB 60s) to avoid sporadic 502s |
| `DATABASE_SINGLE_INSTANCE` | `apps/server/.env` | required (`true`) for `file:` DB in production |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `apps/server/.env` | only OTel var declared in `env.ts`; unset = tracing off |
| `OTEL_SERVICE_NAME` | platform env | span resource `service.name` (wins over `OTEL_RESOURCE_ATTRIBUTES`) |
| `OTEL_RESOURCE_ATTRIBUTES` | platform env | extra resource attributes (`key=value,...`) |
| `OTEL_EXPORTER_OTLP_HEADERS`, `OTEL_TRACES_SAMPLER`, `OTEL_TRACES_SAMPLER_ARG` | platform env | read by OTel SDK/exporter; not in `env.ts` |

## Testing

- Prefer `createApp(...)` + `app.request()` (no real port).
- Use `test/app.ts` `createTestApp()` (silent logger, `createTestDb()`, tiny test router); host tests must not depend on business modules.
- Shutdown tests inject server/DB/exit/timers; never call real `process.exit`.
- Never use developer `.env` or `local.db`.
- `pnpm --filter server test` includes a build smoke test (`GET /healthz` on `dist`).

## Commands

```bash
pnpm --filter server dev
pnpm --filter server build && pnpm --filter server start
pnpm --filter server typecheck
pnpm --filter server test
```
