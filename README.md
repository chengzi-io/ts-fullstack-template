# ts-fullstack-template

TypeScript full-stack monorepo template: **Vite + React**, **Hono + tRPC**, **Drizzle + libSQL**, shared **domain Zod** contracts.

## Quick start

```bash
pnpm install
cp packages/db/.env.example packages/db/.env   # DATABASE_URL=file:../../local.db
pnpm db:push
pnpm dev
```

- Web: Vite (see `apps/web`)
- API: `apps/server` on port 3000 (`/trpc/*`)

## Layout

| Path | Role |
|------|------|
| `apps/web` | SPA — features, routes, tRPC client |
| `apps/server` | HTTP host — env, `createDb`, inject `repos` |
| `packages/domain` | Shared contracts — Zod, `AppRepos` / `*Repo` (no SQL) |
| `packages/api` | tRPC routers + context |
| `packages/db` | Drizzle schema, repos, `createDb` |
| `packages/ui` | Design system |

**Data path:** `web → tRPC (.input/.output from domain) → ctx.repos → Drizzle`.

## Disposable demo

The template includes **authors + posts** (FK, join on list, create forms) so the stack is runnable out of the box.

- Try: `/authors` then `/posts` / `/posts/new`
- Remove when starting a real product: **[docs/REMOVE-DEMO.md](./docs/REMOVE-DEMO.md)**
- Demo uses `db:push` only — do **not** commit demo migrations

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | All apps |
| `pnpm typecheck` | Workspace types |
| `pnpm check` / `pnpm fix` | Ultracite (Biome) |
| `pnpm test` | Package tests |
| `pnpm db:push` | Sync schema (dev / demo) |
| `pnpm db:generate` / `db:migrate` | Real project migrations |

## Docs

- [docs/REMOVE-DEMO.md](./docs/REMOVE-DEMO.md) — delete the scaffold domain
- Package `AGENTS.md` files — boundaries for humans and agents
- [docs/PRE-PRODUCTION-PLAN.md](./docs/PRE-PRODUCTION-PLAN.md) — hardening backlog
