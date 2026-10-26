# server

Thin **HTTP host**: env, process lifecycle, Hono middleware, mount tRPC.
No domain routers, no Drizzle schema, no React.

Workspace map: root `AGENTS.md`. Routers: `@workspace/api`. Data: `@workspace/db`.

## Responsibility

| Owns | Does not own |
|------|----------------|
| `createEnv` (t3-env) + boot wiring | Zod domain shapes / `*Repo` impl |
| `createApp` middleware + probes | tRPC procedure logic |
| pino logger, access log, graceful shutdown | Browser / Vite |
| Load `packages/db/.env` for `DATABASE_*` | Own kit migrations |

## Constraints

- Composition root (`src/index.ts`): env → `createDb` → `createApp({ db, log, router: appRouter })` → listen
- tRPC context: `createTRPCContext({ db, log, requestId, session? })` from `@workspace/kernel/context`; modules build their repos from `db`
- The host itself uses `db` only for `ping` / `close` and probes
- Do **not** import `drizzle-orm` or a module here — the host knows no business capability
- `DATABASE_*` live in `packages/db/.env` (or platform), **not** `apps/server/.env`
- Scripts: `--env-file-if-exists=../../packages/db/.env --env-file-if-exists=.env`
- Never log `DATABASE_AUTH_TOKEN`
- Build: `tsup` bundles `@workspace/*`; keep `@libsql/client` external

## This package’s edge

```mermaid
flowchart TB
  server["apps/server<br/>env · Hono · mount · shutdown"]

  api["@workspace/api"] -->|"appRouter"| server
  kernel["@workspace/kernel"] -->|"createTRPCContext"| server
  db["@workspace/db"] -->|"createDb"| server
  server -.->|"must not"| forbidden["modules · SQL · React"]
```

| Concern | Where |
|---------|--------|
| Procedures, tables, repos, wire Zod | `modules/<domain>` |
| Composition (`appRouter`) | `@workspace/api` |
| HTTP host | this app |

## Layout

```text
src/
  index.ts              composition root + signals
  app.ts                Hono app factory
  env.ts                t3-env + Zod
  lib/logger.ts         pino
  lib/shutdown.ts       idempotent HTTP → DB close
  middleware/access-log.ts
  routes/probes.ts      /healthz · /readyz
test/
  app.ts                createTestApp() → real app on createTestDb(), silent logger
  app.test.ts           probes · request id · error contract (test router)
  shutdown.test.ts      injected server / DB / exit / timers
  env.test.ts           fail-fast config
tsup.config.ts
scripts/smoke-build.mjs
```

## Middleware order

`requestId` → log child + `X-Request-Id` → access log (skip probes) → `secureHeaders` → `bodyLimit` → optional CORS on `/trpc/*` → routes → `notFound` / `onError`

## Endpoints

| Path | Role |
|------|------|
| `GET /healthz` | Liveness |
| `GET /readyz` | Readiness (`db.ping()` → 503 if down) |
| `/trpc/*` | `appRouter` |
| `GET /` | ok text |

## Env

| Var | Owner file | Notes |
|-----|------------|--------|
| `DATABASE_URL` | `packages/db/.env` | required |
| `DATABASE_AUTH_TOKEN` | `packages/db/.env` | remote only |
| `PORT`, `CORS_ORIGIN`, `LOG_LEVEL`, timeouts | `apps/server/.env` | optional defaults |

## Testing

- Prefer `createApp(...)` + `app.request()` — no real listen port
- Use `test/app.ts` `createTestApp()` — silent logger, temp DB from `createTestDb()`,
  and a tiny test router: host tests never depend on a business module
- Shutdown tests inject server/DB/exit/timers — never real `process.exit` in unit tests
- Do not use developer `.env` or `local.db`
- `pnpm --filter server test` includes build smoke (`GET /healthz` on `dist`)

## Commands

```bash
pnpm --filter server dev
pnpm --filter server build && pnpm --filter server start
pnpm --filter server typecheck
pnpm --filter server test
```
