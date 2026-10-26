# modules

One directory per business capability. Everything the server needs for it —
shape, tables, data access, procedures, tests — lives here, so one directory
is the whole context for a change.

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

## Rules

- Field lists live once in `contract.ts`; inputs derive with `pick` / `partial` / `extend`
- Repos throw `@workspace/kernel/errors` for expected failures (`NotFoundError`,
  `ConflictError`, `InvalidReferenceError`); the kernel maps them to tRPC codes,
  so routers carry no error handling
- Constraints are the source of truth: write, then translate
  `isForeignKeyViolation(error)` — never look up then write (it races)
- Repo factories take an `Executor`, so a use case can span modules inside
  `ctx.db.transaction((tx) => …create<X>Repo(tx)…)`
- Name procedures after use cases. CRUD names (`list`, `byId`, `create`) suit
  the demo; real modules say `publish`, `cancel`, …
- To depend on another module, add it to `package.json` and import its
  `contract` or `schema` — never its `router`. pnpm refuses an unlisted module,
  which keeps the graph one-directional (posts → authors, never back)
- Each module has its own `contract.ts`; boundaries above are Biome rules
- `authors` and `posts` are the disposable demo (`docs/REMOVE-DEMO.md`)

## Tests

`createTestContext()` (`@workspace/kernel/testing`) is a real context on a temp
SQLite holding every module's tables:

```ts
const createCaller = createCallerFactory(createTRPCRouter({ authors: authorsRouter }));

beforeEach(async () => {
  const test = await createTestContext();
  caller = createCaller(test.ctx);
  ({ dispose } = test);
});
afterEach(() => dispose());
```

Assert the codes and shapes a client sees. Mount the routers of modules you
depend on when a test needs them (posts tests mount `authorsRouter`).

```bash
pnpm --filter @workspace/<name> test
pnpm --filter @workspace/<name> typecheck
```
