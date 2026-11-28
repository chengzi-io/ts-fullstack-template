# server

HTTP host: **Hono** + tRPC mount. See `AGENTS.md` for architecture boundaries.

| Concern                           | Package             |
| --------------------------------- | ------------------- |
| Process / env / CORS / probes     | **this app**        |
| Procedures / Zod / schema / repos | `modules/<domain>`  |
| `appRouter` composition           | `@workspace/api`    |
| tRPC context / procedures         | `@workspace/kernel` |
| `createDb`                        | `@workspace/db`     |

## Setup

```bash
pnpm install
pnpm setup:local          # creates .env files from .env.example and runs db:push
pnpm --filter server dev
```

| File | Owns |
| --- | --- |
| `packages/db/.env` | `DATABASE_URL`, optional `DATABASE_AUTH_TOKEN` |
| `apps/server/.env` | `PORT`, `CORS_ORIGIN`, `LOG_LEVEL`, timeouts (not `DATABASE_*`) |

Load order: `packages/db/.env`, then `apps/server/.env` (platform env wins).

## Endpoints

| Path | Role |
| --- | --- |
| `GET /healthz` | Liveness |
| `GET /readyz` | Readiness (503 while draining or if `db.ping()` fails; cause logged) |
| `/trpc/*` | tRPC (`authors.*`, `posts.*` demo) |
| `GET /` | ok text |

## Scripts

| Script      | Meaning                         |
| ----------- | ------------------------------- |
| `dev`       | `tsx watch`                     |
| `build`     | `tsdown` → `dist/index.js`      |
| `start`     | run production bundle           |
| `test`      | Vitest + build smoke `/healthz` |
| `typecheck` | `tsc`                           |

## Production

1. `pnpm build` — `dist/index.js` bundles `@workspace/*`; third-party runtime deps (`hono`, `pino`, `@libsql/client`, …) stay external, so ship `node_modules`.
2. `pnpm db:migrate` — run before starting the new version, never on boot (replicas would race).
3. `node dist/index.js` with platform env (`pnpm --filter server start` also loads local `.env` files).

| Env | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | `libsql:` / `https:` in prod; `file:` requires `DATABASE_SINGLE_INSTANCE=true` |
| `DATABASE_AUTH_TOKEN` | remote libSQL | secret from platform store; never logged |
| `NODE_ENV` | `production` |  |
| `PORT`, `LOG_LEVEL`, `CORS_ORIGIN` | no | set `CORS_ORIGIN` only when web is cross-origin |
| `HTTP_KEEP_ALIVE_TIMEOUT_MS` | no | must exceed load balancer idle timeout |
| `SHUTDOWN_DRAIN_MS`, `SHUTDOWN_TIMEOUT_MS` | no | drain = LB deregistration delay; timeout > drain |

- Every response includes `X-Request-Id` (preserving upstream ids), propagated to access logs, procedure logs, and error bodies.
- Shutdown: SIGTERM → `/readyz` 503 → wait `SHUTDOWN_DRAIN_MS` → close HTTP (in-flight requests finish) → close DB → exit 0 (exit 1 if `SHUTDOWN_TIMEOUT_MS` expires).

### Docker

`Dockerfile` builds from the repository root. The image contains `dist/` and production-only `node_modules` (`pnpm deploy`), runs as `node` with `NODE_ENV=production` on port 3000, and checks `/healthz`. Migrations run via the separate `migrate` target, never on server start:

```bash
docker build -f apps/server/Dockerfile -t ts-fullstack-server .
docker build -f apps/server/Dockerfile --target migrate -t ts-fullstack-migrate .

docker run --rm -e DATABASE_URL=libsql://… -e DATABASE_AUTH_TOKEN=… ts-fullstack-migrate
docker run -p 3000:3000 -e DATABASE_URL=libsql://… -e DATABASE_AUTH_TOKEN=… ts-fullstack-server
```

`ts-fullstack-migrate` runs `pnpm db:migrate`, which fails until `packages/db/drizzle/` contains a migration (for the demo schema, override with `… ts-fullstack-migrate pnpm db:push`). A `file:` DB requires a mounted volume and `DATABASE_SINGLE_INSTANCE=true`.
