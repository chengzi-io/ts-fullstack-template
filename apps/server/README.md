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
| `GET /readyz` | Readiness (`db.ping()`) |
| `/trpc/*` | tRPC (`authors.*`, `posts.*` demo) |
| `GET /` | ok text |

## Scripts

| Script | Meaning |
|--------|---------|
| `dev` | tsx watch |
| `build` | tsup → `dist/index.js` |
| `start` | run production bundle |
| `test` | vitest + build smoke `/healthz` |
| `typecheck` | tsc |
