# @workspace/db

Data-layer package for the monorepo. **Owns** Drizzle schema, migrations, and the DB client factory.

Other packages consume this; they do **not** redefine tables or own `drizzle/` migrations.

## Ownership

| Concern | Location |
|---------|----------|
| Table definitions | `src/schema/<name>.ts` (one domain per file) |
| Client factory | `src/client.ts` → `createDb(url)` (`@workspace/db`) |
| Schema import path | `@workspace/db/schema/<name>` (no barrel `index.ts`) |
| Migrations (commit these) | `drizzle/**` |
| Kit config | `drizzle.config.ts` (`schema: "./src/schema/*.ts"`) |
| Kit env | `.env` (from `.env.example`) |

**Do not** put schema or `db:*` scripts in `apps/api` or monorepo root as a second source of truth. Root only proxies:

```bash
pnpm db:push       # → @workspace/db — prefer while iterating
pnpm db:generate   # → when shape is stable; commit drizzle/**
pnpm db:migrate
pnpm db:studio
pnpm db:check
```

## Boundaries

### This package may

- Define Drizzle tables and inferred types (`$inferSelect` / `$inferInsert`)
- Export `createDb(url)` and `Database`
- Run drizzle-kit against `DB_FILE_NAME`

### This package must not

- Read app env (`PORT`, `CORS_ORIGIN`, auth secrets)
- Create a process-wide singleton `db` at import time (apps call `createDb`)
- Depend on Hono, tRPC, or React
- Be imported by `apps/web` (or any browser bundle)

### Consumers

| Consumer | How |
|----------|-----|
| `apps/api` (or future `packages/api`) | `createDb(env.databaseUrl)` at boot; import tables/types from `@workspace/db` |
| `apps/web` | **Never** — use tRPC / API types only |

```ts
import { createDb } from "@workspace/db";
import { postsTable, type Post } from "@workspace/db/schema/posts";

const db = createDb(process.env.DB_FILE_NAME!); // prefer validated env in the app
```

Ultracite forbids barrel `index.ts` re-exports. Public surface is **package.json `exports`** only:

| Import | File |
|--------|------|
| `@workspace/db` | `src/client.ts` |
| `@workspace/db/schema/<name>` | `src/schema/<name>.ts` |

## Layout

```text
packages/db/
├── AGENTS.md
├── package.json              # name: @workspace/db
├── tsconfig.json
├── drizzle.config.ts
├── .env.example              # DB_FILE_NAME=file:local.db
├── .env                      # gitignored
├── local.db                  # gitignored local SQLite file
├── drizzle/                  # migrations — commit
└── src/
    ├── client.ts             # createDb + Database type
    └── schema/
        └── <your-domain>.ts  # one file per domain (see scaffold note below)
```

### Scaffold note: `todos` is disposable

This template ships `src/schema/todos.ts` (and matching api routes/services) **only** so the stack is end-to-end runnable out of the box.

When you start a real product:

1. Add **your** domain files under `src/schema/` (e.g. `users.ts`, `orders.ts`).
2. Remove `todos.ts` and any app code that imports `@workspace/db/schema/todos` once you no longer need the demo.
3. Sync DB: `pnpm db:push` while iterating; `pnpm db:generate` when stable (and drop obsolete todo migrations if you reset history for a greenfield app).

**Do not** treat `todos` as a required or permanent part of the schema. Build your own tables; replace the demo.

## Adding a table (extension recipe)

Prefer **one domain table (or tightly related set) per file**. Name files after **your** domain — not after the template demo.

### 1. Define schema

Add `src/schema/<name>.ts` with `sqliteTable(...)` (or the dialect in use).  
No barrel updates — `exports["./schema/*"]` already maps new files.

### 2. While iterating (local / unstable shape) → `push`

Sync the live DB without writing migration files:

```bash
pnpm db:push
```

Repeat edit → `db:push` as often as needed. Do **not** spam `db:generate` for half-baked tables.

### 3. When the shape is stable → `generate` + `migrate`

Produce the migration history others (and prod) will apply:

```bash
pnpm db:generate    # commit packages/db/drizzle/**
pnpm db:migrate     # apply pending SQL (local check)
```

If you only used `push` until now, still run `generate` once so `drizzle/` matches schema before merge/CI/prod.

### 4. Consume in server code

```ts
import { postsTable, type Post } from "@workspace/db/schema/posts";
```

Do not copy column lists into other packages.

### Rule of thumb

| Phase | Command | Commits `drizzle/`? |
|-------|---------|---------------------|
| Exploring / renaming columns often | `pnpm db:push` | No |
| Shape settled, ready to share | `pnpm db:generate` → commit → `pnpm db:migrate` | Yes |
| Fresh clone / CI / prod | `pnpm db:migrate` only | (apply existing) |

## Scripts

| Script | Meaning |
|--------|---------|
| `db:push` | Push schema to DB **without** migration files — **prefer while developing** |
| `db:generate` | Diff schema → write SQL under `drizzle/` — **after shape stabilizes** |
| `db:migrate` | Apply pending migrations |
| `db:studio` | Drizzle Studio |
| `db:check` | Validate migrations vs schema |
| `db:pull` | Introspect DB → schema (rare; legacy DBs) |
| `typecheck` | `tsc --noEmit` |

## Workflows

**Day-to-day local development**

```bash
# edit src/schema/*
pnpm db:push
# run api / try features; loop until stable
```

**Stabilize before PR / team share**

```bash
pnpm db:generate   # commit drizzle/**
pnpm db:migrate    # sanity-check apply
pnpm db:check
```

**New machine / CI**

```bash
pnpm install
# optional: cp packages/db/.env.example packages/db/.env  (only if not using default file:local.db)
pnpm db:migrate    # apply committed migrations — not push
```

## Env

- This package does **not** use `dotenv`. `createDb(url)` never reads `process.env`.
- Kit: drizzle-kit loads `packages/db/.env` from cwd when present. `DB_FILE_NAME` overrides the default `file:local.db` (relative to **this package cwd**).
- Runtime apps (later): their own env must point at the **same** DB URL when using local SQLite.
- Never commit `.env` or `*.db`.

## Types

- Prefer Drizzle inferred types: `typeof table.$inferSelect` / `$inferInsert`.
- Export domain aliases next to the table (e.g. `Post`, `NewPost`) when they help call sites.
- API input validation (Zod) lives with tRPC / app layers — **not** duplicated as a second schema source of truth here unless you intentionally add `drizzle-zod` later in one place.

## Imports

- External only via package exports: `@workspace/db`, `@workspace/db/schema/<name>`.
- Do not deep-import `packages/db/src/...` from other packages.
- Do not add `src/index.ts` / `src/schema/index.ts` barrels (Ultracite `noBarrelFile`).

## Checklist before finishing a schema change

- [ ] Table file under `src/schema/<name>.ts`
- [ ] Local iteration used `pnpm db:push` while the shape was still moving
- [ ] Once stable: `pnpm db:generate` and **commit** new files under `drizzle/`
- [ ] `pnpm db:migrate` / `pnpm db:check` pass
- [ ] Quality gates pass: `pnpm typecheck` and `pnpm check` (run `pnpm fix` if format/lint is auto-fixable)
- [ ] App env still points at the correct DB URL
