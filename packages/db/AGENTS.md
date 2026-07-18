# @workspace/db

Data-layer package for the monorepo. **Owns** Drizzle schema, migrations, and the DB client factory.

Other packages consume this; they do **not** redefine tables or own `drizzle/` SQL.

## Ownership

| Concern | Location |
|---------|----------|
| Table definitions | `src/schema/<name>.ts` (one domain per file) |
| Client factory | `src/index.ts` → `createDb()` (`@workspace/db`, reads `DATABASE_*` from process.env) |
| Schema import path | `@workspace/db/schema/<name>` (no schema barrel) |
| Migrations (real project only) | `drizzle/**` |
| Kit config | `drizzle.config.ts` (`schema: "./src/schema/*.ts"`, `out: "./drizzle"`, `dialect: "turso"`) |
| DB connection env | `.env` (from `.env.example`) — **only** `DATABASE_URL` / `DATABASE_AUTH_TOKEN`; loaded via Node `--env-file-if-exists=.env` |

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
- Export `createDb()` and `Database`; returned databases expose `ping()` (readiness) and idempotent `close()`
- Own package-local `.env` / `.env.example` for **`DATABASE_*` only** (no dotenv in code)
- Read only `DATABASE_URL` / `DATABASE_AUTH_TOKEN` from `process.env` at runtime
- Run drizzle-kit via scripts that inject this package's `.env`
- Store semantic string enums (`L`/`M`/`H`) as persistence-owned constants. Keep them aligned with wire values deliberately, without importing `@workspace/trpc`.

### This package must not

- Use the `dotenv` package or load app env (`PORT`, `CORS_ORIGIN`, secrets unrelated to DB)
- Put non-DB variables in this package's `.env`
- Create a process-wide singleton `db` at import time (apps call `createDb()`)
- Depend on Hono, tRPC, or React
- Be imported by `apps/web` (or any browser bundle)

## Template migration policy

- `todos` is disposable demo code, so this template intentionally keeps `drizzle/` empty except for `.gitkeep`
- While evaluating the template, use `db:push`; do not generate or commit a Todo migration
- After replacing Todo with real domains, stabilize the real schema and generate that project's first migration
- From the first real migration onward, commit `drizzle/**` and use `db:migrate` in shared, CI, and production environments
- Tests use isolated temporary SQLite plus schema `push`; they must never write generated artifacts into `drizzle/`

### Consumers

| Consumer | How |
|----------|-----|
| `apps/server` | Validate/load env first, call `createDb()`, use `db.ping()` for `/readyz`, close during shutdown |
| `packages/trpc` | Receive the host-created `Database` through context; import tables/types from `@workspace/db` |
| `apps/web` | **Never** — use tRPC / API types only |

```ts
import { createDb } from "@workspace/db";
import { postsTable, type Post } from "@workspace/db/schema/posts";

// Host must populate process.env.DATABASE_URL (+ optional DATABASE_AUTH_TOKEN) first
const db = createDb();

await db.ping(); // readiness / connectivity — hosts must not import drizzle-orm for this
db.close(); // process shutdown; safe to call more than once
```

**Hosts (`apps/server`) must not import `drizzle-orm`.** Connectivity and lifecycle stay on `Database` (`ping` / `close`). Application query code in `packages/trpc` may import drizzle helpers while services write SQL-shaped queries.

`src/index.ts` is the package entry (implementation, not a re-export barrel). Schema stays one file per domain — no `src/schema/index.ts`. Public surface is **package.json `exports`** only:

| Import | File |
|--------|------|
| `@workspace/db` | `src/index.ts` |
| `@workspace/db/schema/<name>` | `src/schema/<name>.ts` |

## Layout

```text
packages/db/
├── AGENTS.md
├── package.json              # name: @workspace/db
├── tsconfig.json
├── drizzle.config.ts
├── .env.example              # DATABASE_URL / DATABASE_AUTH_TOKEN only
├── .env                      # gitignored; copy from .env.example
├── local.db                  # gitignored local SQLite (when using file:local.db)
├── drizzle/                  # .gitkeep in template; real project migrations later
└── src/
    ├── index.ts              # createDb() + Database type + ping/close lifecycle
    └── schema/
        └── <your-domain>.ts  # one file per domain (see scaffold note below)
```

### Scaffold note: `todos` is disposable

This template ships `src/schema/todos.ts` (and matching api routes/services) **only** so the stack is end-to-end runnable out of the box.

When you start a real product:

1. Add **your** domain files under `src/schema/` (e.g. `users.ts`, `orders.ts`).
2. Remove `todos.ts` and any app code that imports `@workspace/db/schema/todos` once you no longer need the demo.
3. Sync the demo with `pnpm db:push`; do not generate migrations yet.
4. After Todo is removed and the real schema is stable, run `pnpm db:generate` to create the project's first migration.

**Do not** treat `todos` as a required or permanent part of the schema. Build your own tables; replace the demo.

## Adding a table (extension recipe)

Prefer **one domain table (or tightly related set) per file**. Name files after **your** domain — not after the template demo.

### 1. Define schema

Add `src/schema/<name>.ts` with `sqliteTable(...)` (or the dialect in use).  
No barrel updates — `exports["./schema/*"]` already maps new files.

Column order is **domain order**, not alphabetical (Biome `useSortedKeys` is off for this folder):

1. `id` (and other keys)
2. table-specific fields
3. shared timestamps / audit fields (`createdAt`, `updatedAt`, …)

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
|-------|---------|----------------------------|
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
| `test` | Run DB tests once; passes with the intentionally empty scaffold |
| `test:watch` | Watch DB tests during product development |
| `typecheck` | `tsc --noEmit` |

## Testing

- Use a unique temporary SQLite file per suite and initialize it from the current Drizzle schema without generating migrations
- Close the client idempotently and delete `.db`, `-wal`, and `-shm` files in cleanup, including failure paths
- Do not use the developer's app `.env`, `local.db`, or remote database
- Test real constraints, indexes, transactions, and client lifecycle when a product adds them

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
# template demo only (no committed migration):
pnpm db:push

# real project after its first migration exists:
pnpm db:migrate
```

## Env

- This package **owns** `DATABASE_*` via `.env` / `.env.example` but does **not** use the `dotenv` package.
- `createDb()` reads `process.env` only (never logs credentials):
  - `DATABASE_URL` — required at call time; local `file:…` or remote `libsql://…`
  - `DATABASE_AUTH_TOKEN` — optional; required for remote Turso, omit for local files
- Kit scripts: `node --env-file-if-exists=.env ./node_modules/drizzle-kit/bin.cjs …`
  - **`DATABASE_URL` is required** (no default). Missing → config throws. Copy `.env.example` → `.env` or export in CI.
- Hosts (e.g. `apps/server`) load this package's `.env` (or platform env), then validate with t3-env; they do **not** re-declare `DATABASE_*` in their own `.env`.
- Examples:

  ```bash
  cp .env.example .env   # once, from packages/db (includes DATABASE_URL=file:local.db)
  DATABASE_URL=libsql://….turso.io DATABASE_AUTH_TOKEN=… pnpm db:push
  ```

- Never commit secrets or `*.db`.

## Types

- Prefer Drizzle inferred types at the **call site**: `typeof table.$inferSelect` / `$inferInsert` (e.g. in services). Do **not** export `Todo` / `NewTodo`-style aliases from schema files by default — they become a second public surface next to the table.
- Wire / API shapes live in tRPC Zod (`todoOutput`, inputs). Clients use `RouterOutputs` / `RouterInputs`, not db row types.
- Do not reverse-depend: services should not type rows as `z.output<typeof todoOutput>`; router `.output(...)` is the wire boundary.

## Imports

- External only via package exports: `@workspace/db`, `@workspace/db/schema/<name>`.
- Do not deep-import `packages/db/src/...` from other packages.
- Do not add `src/schema/index.ts` barrels (Ultracite `noBarrelFile`). `src/index.ts` is the package entry implementation, not a re-export barrel.

## Checklist before finishing a schema change

- [ ] Table file under `src/schema/<name>.ts`
- [ ] Local iteration used `pnpm db:push` while the shape was still moving
- [ ] Disposable Todo did not generate a migration
- [ ] Once the real schema is stable: `pnpm db:generate` and **commit** new files under `drizzle/`
- [ ] `pnpm db:migrate` / `pnpm db:check` pass
- [ ] Quality gates pass: package tests, `pnpm typecheck`, and `pnpm check` (run `pnpm fix` if format/lint is auto-fixable)
- [ ] App env still points at the correct DB URL
