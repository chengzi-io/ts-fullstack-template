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

One business capability = one directory in `modules/`, with its UI in
`apps/web/src/features/<same name>`.

| Path | Role |
|------|------|
| `modules/<domain>` | A capability top to bottom: contract (Zod) · schema · repo · router · tests |
| `apps/web` | SPA — features mirror modules; routes; tRPC client |
| `apps/server` | HTTP host — env, `createDb`, mount `appRouter` |
| `packages/api` | Composition — `appRouter`, one line per module |
| `packages/kernel` | Module SDK — procedures, error mapping, context, pagination, test context |
| `packages/db` | `createDb`, `Executor`, test database, drizzle config + migrations |
| `packages/ui` | Design system |

**Data path:** `web → tRPC (contract .input/.output) → module router → module repo → Drizzle`.

## Disposable demo

The template includes **authors + posts** (FK, join on list, create forms) so the stack is runnable out of the box.

- Try: `/authors`, then `/posts` (create a post before any author exists)
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
