# server

Thin HTTP host. Do **not** put domain routers or Drizzle schema here.

- Mount tRPC from `@workspace/api`
- Inject `db`, `requestId`, `log` via `createContext`
- Process wiring stays in `src/index.ts`; inject `db`, `corsOrigin`, and `log` into `createApp`
- Probes: **`GET /healthz`** (alive), **`GET /readyz`** (DB OK); **no `/health`**
- Non-RPC adapters (webhooks, etc.) stay here
- Graceful shutdown: `SIGINT` / `SIGTERM` → `server.close()` (see `src/index.ts`)
- `DB_FILE_NAME` is optional locally (defaults to packages/db SQLite file)
- Env: envalid-style `loadEnv` + `str`/`port`/`num`/`bool` in `src/lib/load-env.ts`
- Logging: **pino** (`src/lib/logger.ts`); access log skips `/healthz` `/readyz`
- Default middleware stack: `requestId` → log child → access log → `secureHeaders` → `bodyLimit` → cors → routes → `notFound` / `onError`
- Temporary backlog: `docs/TEMP-PROD-BACKLOG.md` (delete when drained)

## Testing

- Prefer integration tests through `createApp(...)` + `app.request()`; do not bind a real TCP port
- Inject a silent logger, explicit CORS config, and an isolated DB into `createApp`
- Cover middleware order, probes, request IDs, CORS, body limits, not-found responses, and error handling when those behaviors change
- Never read the developer's `.env` or `local.db` from tests
- Run `pnpm --filter server test`; use `pnpm --filter server test:watch` while developing

See `packages/api/AGENTS.md` and `packages/db/AGENTS.md`.
