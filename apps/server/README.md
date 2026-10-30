# server

HTTP host: **Hono** + tRPC mount. See `AGENTS.md` for agent-oriented boundaries.

| Concern | Package |
|---------|---------|
| Process / env / CORS / probes | **this app** |
| Procedures / Zod / schema / repos | `modules/<domain>` |
| `appRouter` composition | `@workspace/api` |
| tRPC context / procedures | `@workspace/kernel` |
| `createDb` | `@workspace/db` |

## Setup

```bash
pnpm install
cp packages/db/.env.example packages/db/.env   # DATABASE_URL=file:../../local.db
pnpm db:push
pnpm --filter server dev
```

| File | Owns |
|------|------|
| `packages/db/.env` | `DATABASE_URL`, optional `DATABASE_AUTH_TOKEN` |
| `apps/server/.env` | `PORT`, `CORS_ORIGIN`, `LOG_LEVEL`, timeouts — **not** `DATABASE_*` |

Load order: `packages/db/.env` then `apps/server/.env` (platform env wins if set).

## Endpoints

| Path | Role |
|------|------|
| `GET /healthz` | Liveness |
| `GET /readyz` | Readiness — 503 while shutdown drains or `db.ping()` fails (cause logged) |
| `/trpc/*` | tRPC (`authors.*`, `posts.*` demo) |
| `GET /` | ok text |

## Scripts

| Script | Meaning |
|--------|---------|
| `dev` | tsx watch |
| `build` | tsdown → `dist/index.js` |
| `start` | run production bundle |
| `test` | vitest + build smoke `/healthz` |
| `typecheck` | tsc |

## Production

1. `pnpm build` — `dist/index.js` bundles every `@workspace/*` package;
   third-party runtime dependencies (hono, pino, `@libsql/client`, …) stay
   external, so ship `node_modules` with it
2. `pnpm db:migrate` — before starting the new version, never on boot
   (replicas would race to migrate)
3. `node dist/index.js` with the platform's env (`pnpm --filter server start`
   additionally loads the local `.env` files)

| Env | Required | Notes |
|-----|----------|-------|
| `DATABASE_URL` | yes | `libsql:` / `https:` in production; `file:` needs `DATABASE_SINGLE_INSTANCE=true` |
| `DATABASE_AUTH_TOKEN` | remote libSQL | secret — inject from the platform's secret store; never logged |
| `NODE_ENV` | set to `production` | |
| `PORT`, `LOG_LEVEL`, `CORS_ORIGIN` | no | `CORS_ORIGIN` only when the web is on another origin |
| `HTTP_KEEP_ALIVE_TIMEOUT_MS` | no | must exceed the load balancer's idle timeout |
| `SHUTDOWN_DRAIN_MS`, `SHUTDOWN_TIMEOUT_MS` | no | drain = the load balancer's deregistration delay; timeout above it |

- Every response carries `X-Request-Id` (an upstream id is kept); access
  logs, procedure logs, and error bodies carry the same id
- Shutdown: SIGTERM → `/readyz` 503 → wait `SHUTDOWN_DRAIN_MS` → close HTTP
  (in-flight requests finish) → close DB → exit 0; exit 1 if it exceeds
  `SHUTDOWN_TIMEOUT_MS`

### Docker

`Dockerfile` builds from the repository root. The image holds `dist/` and
production-only `node_modules` (`pnpm deploy`), runs as `node` with
`NODE_ENV=production` on port 3000, and its `HEALTHCHECK` calls `/healthz`.
It never migrates on start; the `migrate` target is the one-off job.

```bash
docker build -f apps/server/Dockerfile -t ts-fullstack-server .
docker build -f apps/server/Dockerfile --target migrate -t ts-fullstack-migrate .

docker run --rm -e DATABASE_URL=libsql://… -e DATABASE_AUTH_TOKEN=… ts-fullstack-migrate
docker run -p 3000:3000 -e DATABASE_URL=libsql://… -e DATABASE_AUTH_TOKEN=… ts-fullstack-server
```

`ts-fullstack-migrate` runs `pnpm db:migrate`, which fails until
`packages/db/drizzle/` holds a migration; the demo schema has none, so use
`… ts-fullstack-migrate pnpm db:push` until then. A `file:` database needs a
mounted volume and `DATABASE_SINGLE_INSTANCE=true`.
