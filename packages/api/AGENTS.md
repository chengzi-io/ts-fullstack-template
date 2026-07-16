# @workspace/api

tRPC **contract + procedures** package. Owns routers, Zod inputs, and domain services that talk to `@workspace/db`.

HTTP serving, env, and process lifecycle live in **`apps/server`** — not here.

## Ownership

| Concern | Location |
|---------|----------|
| `initTRPC` / procedures | `src/trpc.ts` |
| Context shape + factory | `src/context.ts` |
| Root router + `AppRouter` type | `src/root.ts` (`@workspace/api`) |
| Domain modules | `src/modules/<name>/` |
| Domain router | `src/modules/<name>/router.ts` |
| Zod inputs (tRPC) | `src/modules/<name>/schema.ts` |
| DB-facing logic | `src/modules/<name>/service.ts` (receive `db` from context) |
| Shared list pagination | `src/shared/pagination.ts` (page / pageSize / total) |

## Boundaries

### This package may

- Define tRPC routers and Zod `.input()` schemas
- Call `@workspace/db` / `@workspace/db/schema/*` via `ctx.db`
- Throw `TRPCError`

### This package must not

- Call `serve` / bind a port / read `PORT` / `CORS_*`
- Create a process-wide `db` singleton (host injects `db` into context)
- Depend on React / Vite / `apps/web`
- Reintroduce parallel REST CRUD for the same domain (tRPC is the FE↔BE path)

### Consumers

| Consumer | How |
|----------|-----|
| `apps/server` | Mount `appRouter` + `createContext({ db })` on Hono `/trpc` |
| `apps/web` (later) | `import type { AppRouter } from "@workspace/api"` only — no runtime server imports |
| `apps/web` | Never import services / context implementation for data access |

```ts
// host
import { appRouter } from "@workspace/api";
import { createContext } from "@workspace/api/context";

createContext({
  db,
  requestId,
  log, // structural AppLogger (e.g. pino child) — no pino dependency here
});

// future web (type only)
import type { AppRouter } from "@workspace/api";
```

`Context` fields: `db`, `requestId`, `log` (`AppLogger`). Host owns logger implementation.

## Layout

```text
packages/api/
├── AGENTS.md
├── package.json              # @workspace/api
├── tsconfig.json
└── src/
    ├── context.ts
    ├── trpc.ts
    ├── root.ts               # appRouter + AppRouter
    ├── shared/
    │   └── pagination.ts     # page/pageSize fields + PaginatedResult
    └── modules/
        └── todos/            # disposable template demo
            ├── router.ts
            ├── schema.ts
            └── service.ts
└── test/                     # product tests; intentionally empty in template
```

## List pagination (all domains)

Admin-table style (**page / pageSize / total**). Defaults are **inline** in `paginationSchema` (1 / 20 / max 100) — no package-level `DEFAULT_*` exports.

| Helper | Role |
|--------|------|
| `paginationSchema` | Zod `page` + `pageSize` base schema |
| `Pagination` | Parsed `{ page, pageSize }` type |
| `PaginatedResult<T>` | `{ items, page, pageSize, total, pageCount }` |

```ts
// modules/posts/schema.ts
export const listPostsInput = paginationSchema
  .extend({ authorId: z.number().optional() })
  .prefault({});

// modules/posts/service.ts
export async function listPosts(...): Promise<PaginatedResult<Post>> {
  const { page, pageSize, ...filters } = input;
  const where = /* from filters */;
  const [items, total] = await Promise.all([
    db.select()...limit(pageSize).offset((page - 1) * pageSize),
    db.$count(postsTable, where),
  ]);
  return { items, page, pageCount: Math.ceil(total / pageSize), pageSize, total };
}
```

- Lists always have a **max pageSize** (default 100 via factory).
- Same `where` for select and count.
- Cursor/infinite-scroll is a separate concern if you need it later — not the template default.

## Scaffold note: `todos` is disposable

`todos` router/schema/service exist only so the template is end-to-end runnable. When building a product:

1. Add your domain under `modules/<domain>/`.
2. Register on `appRouter` in `root.ts`.
3. Remove `todos` and matching `@workspace/db/schema/todos` when no longer needed.

## Adding a procedure (extension recipe)

1. Zod input in `src/modules/<domain>/schema.ts` (tRPC JSON shapes — real `boolean`/`number`, not query-string coerce).
2. Service functions take `db: Database` as first arg (or only use `ctx` in thin routers).
3. `src/modules/<domain>/router.ts` with `publicProcedure` (or future `protectedProcedure`).
4. Wire into `appRouter` in `root.ts`.
5. Host already mounts `/trpc` — no new Hono REST route for CRUD.

## Scripts / quality

```bash
pnpm --filter @workspace/api test
pnpm --filter @workspace/api test:watch
pnpm --filter @workspace/api typecheck
pnpm typecheck
pnpm check    # fix with pnpm fix if needed
```

## Testing

- Prefer `appRouter.createCaller()` with a real Context and isolated SQLite over mocking tRPC or Drizzle
- Test a domain vertically: input schema, router, service, DB writes, errors, and pagination in the same integration path
- Test helpers stay under `test/` and must not become runtime package exports
- Never create a process-wide DB singleton or read app env from tests

## Checklist before finishing a router change

- [ ] Domain files colocated under `modules/<domain>/` (no REST twin)
- [ ] Registered on `appRouter`
- [ ] Errors use `TRPCError` codes (`NOT_FOUND`, …)
- [ ] Package tests, `pnpm typecheck`, and `pnpm check` pass
- [ ] Demo `todos` not treated as permanent product schema
