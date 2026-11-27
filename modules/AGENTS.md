# modules

One directory per business capability: contract, schema, repo, router, and tests live together so one directory holds the full server context.

## Anatomy (copy `authors`)

```text
modules/<name>/
  package.json         exports ./contract ./schema ./router
  src/contract.ts      Zod shapes + z.output types (browser-safe)
  src/schema.ts        Drizzle tables (keys → fields → timestamps)
  src/repo.ts          create<Name>Repo(db: Executor) — only code touching its tables
  src/router.ts        <name>Router — procedures read repo from ctx.<name>
  test/router.test.ts  router tests via createTestContext()
```

## Adding a new module

1. Set `"name": "@workspace/<domain>"` in `package.json`, add it as a workspace dependency in `packages/api` (and `apps/web` if it has UI), mount its router in `packages/api/src/index.ts`, then run `pnpm install`.
2. Use `.js` extensions on relative imports (`moduleResolution: "NodeNext"`): `./contract.js`, `./schema.js`, `./repo.js`.
3. Keep tables in `src/schema.ts` (`drizzle.config.ts` and `createTestDb()` glob this path automatically).
4. Index every `.references(…)` column explicitly (`index("<table>_<column>_idx").on(table.column)`): SQLite does not auto-index foreign keys, so restrict checks otherwise scan the table.
5. Add `.prefault({})` (Zod v4) to list inputs so zero-arg calls work, and an empty-patch `.refine()` to update inputs so `{}` is rejected instead of silently no-oping.

## Rules

- Define each entity's field list once in `contract.ts`; derive inputs with `pick` / `partial` / `extend`.
- Repos throw `@workspace/kernel/errors` (`NotFoundError`, `ConflictError`, `InvalidReferenceError`); kernel middleware maps them to tRPC codes, so routers do no error handling.
- Let DB constraints decide: write directly, then translate `isForeignKeyViolation(error)` instead of check-then-write (which races).
- Repo factories accept an `Executor` so multi-module use cases can share a transaction: `ctx.db.transaction((tx) => …create<X>Repo(tx)…)`.
- Name procedures after use cases (`publish`, `cancel`, …); CRUD names (`list`, `byId`, `create`) are only for the demo.
- Cross-module dependencies must be declared in `package.json` and import only `contract` or `schema` (never `router`). pnpm enforces declaration and Oxlint enforces boundaries, keeping the graph one-way (`posts` → `authors`).
- **Logging:** kernel already logs every procedure call (path, type, status, duration, request id, and driver root cause on 500s). Call `ctx.log.info({ postId }, "post published")` only for events that line cannot explain — log ids, never full inputs or PII. Use a table, not logs, for an audit trail.
- `authors` and `posts` are the disposable demo (`docs/REMOVE-DEMO.md`).

## Tests

`createTestContext()` (`@workspace/kernel/testing`) creates a real context on a temp SQLite containing all module tables:

```ts
const createCaller = createCallerFactory(
  createTRPCRouter({ authors: authorsRouter })
);

beforeEach(async () => {
  const context = await createTestContext();
  caller = createCaller(context.ctx);
  ({ dispose } = context);
});
afterEach(() => dispose());
```

Assert the codes and shapes a client sees. Mount dependency routers when needed (e.g. `posts` tests mount `authorsRouter`).

```bash
pnpm --filter @workspace/<name> test
pnpm --filter @workspace/<name> typecheck
```

## Minimal module skeleton (post-demo reference)

Canonical shape after `docs/REMOVE-DEMO.md` removes `authors` and `posts`:

```ts
// contract.ts — Zod shapes + z.output types only; browser-safe
export const thingSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  createdAt: z.date(),
});
export const createThingInput = thingSchema.pick({ title: true });
export const listThingsInput = paginationInput.prefault({});
export type Thing = z.output<typeof thingSchema>;

// schema.ts — Drizzle table, FK indexed explicitly
export const thingsTable = sqliteTable(
  "things",
  {
    id: int().primaryKey({ autoIncrement: true }),
    title: text().notNull(),
    createdAt: int({ mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [index("things_title_idx").on(table.title)]
);

// repo.ts — only code touching the table; throws kernel errors
export function createThingsRepo(db: Executor) {
  return { byId, create, list };
}

// router.ts — procedures read repo from ctx; no error handling
const thingsProcedure = publicProcedure.use(({ ctx, next }) =>
  next({ ctx: { things: createThingsRepo(ctx.db) } })
);
export const thingsRouter = {
  list: thingsProcedure.input(listThingsInput).output(listThingsOutput).query(…),
} satisfies TRPCRouterRecord;
```
