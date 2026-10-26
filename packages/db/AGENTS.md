# @workspace/db

Database plumbing shared by every module: the client, the transaction-aware
`Executor` type, constraint helpers, the test database, and drizzle-kit
config + migrations. **Tables and queries live in `modules/<domain>`**, not here.
No Hono / tRPC / React. No `process.env` inside `createDb`.

## Public surface

| Import | What |
|--------|------|
| `@workspace/db` | `createDb(config)` → `ping` / `close`; `Database`; `Executor` (db or transaction); `isForeignKeyViolation(error)` |
| `@workspace/db/testing` | `createTestDb()` — tests only |

```ts
const db = createDb({ url: env.DATABASE_URL, authToken: env.DATABASE_AUTH_TOKEN });
await db.ping();
db.close();
```

## Constraints

- The host validates env and passes config into `createDb({ url, authToken? })`
- Relative `file:` paths use **process.cwd()**; template `.env` uses
  `file:../../local.db` so kit (`packages/db`) and server (`apps/server`) share
  the monorepo-root `local.db`
- `isForeignKeyViolation` matches SQLite's message, not `extendedCode`:
  an `onDelete: "restrict"` delete reports `SQLITE_CONSTRAINT_TRIGGER`
- Never depend on `@workspace/kernel`, a module, Hono, or React — this package
  sits at the bottom

## Schema discovery

Every module keeps its tables in `modules/<name>/src/schema.ts`. Both
`drizzle.config.ts` and `createTestDb()` glob that path, so adding a module
needs no change here.

## Migrations

| Phase | Command | Commit `drizzle/`? |
|-------|---------|--------------------|
| Local / shape still moving | `pnpm db:push` | No |
| Shape stable (team / CI / prod) | `pnpm db:generate` → migrate | Yes |
| Clone with migrations | `pnpm db:migrate` only | Apply existing |

Demo schema: **push only** — do not commit demo migrations.

## Env (kit vs runtime)

- Kit: this package `.env` (`cp .env.example .env`); scripts use `--env-file-if-exists=.env`
- `DATABASE_URL` required for kit (see `drizzle.config.ts`)
- Runtime: host validates env, then `createDb({ url, authToken? })`
- Never commit secrets or `*.db`

## Testing

- `createTestDb()` gives each caller a temp SQLite file with every module's
  current tables (`drizzle-kit export`, not migrations); with no modules it is empty
- `dispose()` closes the client and deletes the file with `-wal` / `-shm`; it also runs when schema setup fails
- Modules use it through `createTestContext()` (`@workspace/kernel/testing`)
- Do not hit developer `local.db` or remote DBs

## Commands

```bash
pnpm db:push | db:generate | db:migrate | db:studio | db:check
pnpm --filter @workspace/db typecheck
```
