# server

HTTP host for the monorepo: **Hono** + **tRPC** mount.

| Concern | Package |
|---------|---------|
| Process / env / CORS / health | **this app** |
| Routers / Zod / services | `@workspace/api` |
| Schema / migrations / `createDb` | `@workspace/db` |

## Setup

```bash
# from monorepo root
pnpm install
pnpm db:push    # or db:migrate when migrations exist
pnpm --filter server dev
```

`apps/server/.env` is **optional** for local defaults:

| Var | Default | When to set |
|-----|---------|-------------|
| `DB_FILE_NAME` | `file:../../packages/db/local.db` | Remote libsql / custom path |
| `PORT` | `3000` | Different listen port |
| `CORS_ORIGIN` | (none) | Browser client on another origin |

Runtime still needs a DB URL under the hood (`createDb`); you just don't have to put `DB_FILE_NAME` in `.env` if the monorepo default is fine. Kit (`pnpm db:*`) uses `packages/db` cwd / its own default — keep both pointing at the same database file when developing locally.

## Endpoints

| Path | Role |
|------|------|
| `GET /healthz` | Liveness (process up) |
| `GET /readyz` | Readiness (DB reachable; **503** if not) |
| `/trpc/*` | tRPC (`appRouter` from `@workspace/api`) |
| `GET /` | Simple ok text |

Demo procedures (disposable): `todos.list`, `todos.byId`, `todos.create`, `todos.update`, `todos.delete`.

## Middleware / observability

| Layer | Behavior |
|-------|----------|
| `requestId` | Correlate logs and error JSON |
| pino access log | method / path / status / durationMs |
| `secureHeaders` | Baseline security headers |
| `bodyLimit` | 1 MiB default |
| `cors` | Only when `CORS_ORIGIN` is set (`/trpc/*`) |
| `notFound` / `onError` | JSON `{ error, requestId }` |

tRPC context receives `{ db, requestId, log }` from the host.
`index.ts` owns process-level wiring and injects `db`, `corsOrigin`, and `log` into `createApp`.

## Scripts

`dev` / `build` / `start` / `typecheck`. Database kit: root `pnpm db:*` → `@workspace/db`.
