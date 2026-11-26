# modules

One directory per business capability. Everything the server needs for it — shape, tables, data access, procedures, tests — lives here, so one directory is the whole context for a change.

## Anatomy (copy `authors`)

```text
modules/<name>/
  package.json         exports ./contract ./schema ./router
  src/contract.ts      Zod shapes + z.output types — browser-safe
  src/schema.ts        Drizzle tables (keys → fields → timestamps)
  src/repo.ts          create<Name>Repo(db: Executor) — the only code touching its tables
  src/router.ts        <name>Router — procedures get the repo on ctx.<name>
  test/router.test.ts  router tests via createTestContext()
```

## Adding a new module

1. Set `"name": "@workspace/<domain>"` in its `package.json`, add it as a workspace dependency in `packages/api` (and `apps/web` when it has UI), register the router in `packages/api/src/index.ts`, then `pnpm install` — pnpm will not resolve an unlisted module.
2. Relative imports carry `.js` (`moduleResolution: "NodeNext"`): `./contract.js`, `./schema.js`, `./repo.js`.
3. Tables stay in `src/schema.ts` — `drizzle.config.ts` and `createTestDb()` glob that path, so nothing needs registering.
4. SQLite does not index foreign keys: add an explicit `index("<table>_<column>_idx").on(table.column)` for every `.references(…)` column, or the restrict check scans the table.
5. List inputs need `.prefault({})` (Zod v4) so a zero-arg call passes, and update inputs need an empty-patch `.refine()` so `{}` is rejected instead of silently no-op'ing.

## Rules

- Field lists live once in `contract.ts`; inputs derive with `pick` / `partial` / `extend`
- Repos throw `@workspace/kernel/errors` for expected failures (`NotFoundError`, `ConflictError`, `InvalidReferenceError`); the kernel maps them to tRPC codes, so routers carry no error handling
- Constraints are the source of truth: write, then translate `isForeignKeyViolation(error)` — never look up then write (it races)
- Repo factories take an `Executor`, so a use case can span modules inside `ctx.db.transaction((tx) => …create<X>Repo(tx)…)`
- Name procedures after use cases. CRUD names (`list`, `byId`, `create`) suit the demo; real modules say `publish`, `cancel`, …
- To depend on another module, add it to `package.json` and import its `contract` or `schema` — never its `router`. pnpm refuses an unlisted module, which keeps the graph one-directional (posts → authors, never back)
- Each module has its own `contract.ts`; boundaries above are Oxlint rules
- Logging: the kernel logs every procedure call (path, type, status, duration, request id; the root cause on a 500). Add `ctx.log.info({ postId }, "post published")` only for an event that log line cannot explain — ids, never whole inputs or personal data. An audit trail (who changed what) is a table, not a log
- `authors` and `posts` are the disposable demo (`docs/REMOVE-DEMO.md`)

## Tests

`createTestContext()` (`@workspace/kernel/testing`) is a real context on a temp SQLite holding every module's tables:

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

Assert the codes and shapes a client sees. Mount the routers of modules you depend on when a test needs them (posts tests mount `authorsRouter`).

```bash
pnpm --filter @workspace/<name> test
pnpm --filter @workspace/<name> typecheck
```

## Minimal module skeleton (post-demo reference)

After `docs/REMOVE-DEMO.md` deletes `authors` and `posts`, this is the canonical shape:

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

// repo.ts — the only code touching the table; throws kernel errors
export function createThingsRepo(db: Executor) {
  return { byId, create, list };
}

// router.ts — procedures read the repo off ctx; no error handling
const thingsProcedure = publicProcedure.use(({ ctx, next }) =>
  next({ ctx: { things: createThingsRepo(ctx.db) } })
);
export const thingsRouter = {
  list: thingsProcedure.input(listThingsInput).output(listThingsOutput).query(…),
} satisfies TRPCRouterRecord;
```
