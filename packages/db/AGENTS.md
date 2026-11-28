# @workspace/db

Shared database plumbing: libSQL client, transaction-aware `Executor`, constraint helpers, test DB, drizzle-kit config, and migrations. Tables and queries live in `modules/<domain>`, not here. No Hono, tRPC, React, or `process.env` inside `createDb`. Drizzle stays on the stable line, pinned exact — not 1.0 RC (`docs/DECISIONS.md` #17).

## Public surface

| Import | Exports |
| --- | --- |
| `@workspace/db` | `createDb(config)` (`ping`, `close`), `Database`, `Executor` (db or tx), `isForeignKeyViolation(error)`, `containsText(column, q)` |
| `@workspace/db/testing` | `createTestDb()` (tests only) |

```ts
const db = createDb({
  url: env.DATABASE_URL,
  authToken: env.DATABASE_AUTH_TOKEN,
});
await db.ping();
db.close();
```

## Constraints & env

- Sits at the bottom of the dependency graph: never depend on `@workspace/kernel`, any module, Hono, or React.
- **Schema discovery:** modules keep tables in `modules/<name>/src/schema.ts`; `drizzle.config.ts` and `createTestDb()` glob that path automatically.
- **Kit vs runtime env:** drizzle-kit loads `packages/db/.env` (`--env-file-if-exists=.env`; requires `DATABASE_URL`). At runtime, the host validates env and passes `{ url, authToken? }` to `createDb`. Never commit secrets or `*.db`.
- **Relative `file:` paths** resolve against `process.cwd()`; template `.env` uses `file:../../local.db` so `packages/db` and `apps/server` share the repo-root `local.db`.
- **`isForeignKeyViolation`** matches SQLite's error message, not `extendedCode` (`onDelete: "restrict"` reports `SQLITE_CONSTRAINT_TRIGGER`).

## Migrations

| Phase | Command | Commit `drizzle/`? |
| --- | --- | --- |
| Local / schema still moving | `pnpm db:push` | No |
| Schema stable (team / CI / prod) | `pnpm db:generate` → `db:migrate` | Yes |
| Clone with migrations | `pnpm db:migrate` only | Apply existing |

Demo schema uses `db:push` only — do not commit demo migrations. `pnpm db:migrate` runs `scripts/migrate.mjs` to preflight `drizzle/meta/_journal.json` and fail loud if no migrations exist yet, instructing you to run `pnpm db:generate`.

## Testing

- `createTestDb()` creates a temp SQLite file populated via `drizzle-kit export` (not migrations); with no modules it is empty.
- `dispose()` closes the client and deletes the DB file plus `-wal`/`-shm` (also runs on setup failure).
- Modules consume it through `createTestContext()` (`@workspace/kernel/testing`). Never hit `local.db` or remote DBs.
- `test/db.test.ts` asserts `PRAGMA foreign_keys = ON` on both `createDb` and `createTestDb`; keep it when changing either factory because module restrict tests rely on it.

## Switching away from libSQL

Modules depend only on `Executor` and the helpers above, so swapping databases is mostly local to this package:

| Place | Current libSQL / SQLite coupling | Postgres example |
| --- | --- | --- |
| `src/index.ts` `createDb` | `@libsql/client` + `drizzle-orm/libsql` | driver client + drizzle adapter; keep `ping` / `close` |
| `isForeignKeyViolation` | `LibsqlError` + SQLite message | driver error code (`23503`); keep `cause` walk |
| `containsText` | `instr(lower(…))` | `ILIKE` (escaped `%`/`_`) or `strpos(lower(…))` |
| `drizzle.config.ts` | `dialect: "turso"` | target dialect |
| `src/testing.ts` | `drizzle-kit export --dialect turso`, temp file, `$client.executeMultiple` | throwaway DB/schema per test (or PGlite) |
| `modules/*/src/schema.ts` | `sqliteTable`, `int({ mode: "timestamp_ms" })`, autoincrement | `pgTable`, `timestamp`, identity / UUID |
| `apps/server/src/env.ts` | URL schemes; `file:` single-instance guard | new schemes; drop file guard if unused |
| `apps/server` `package.json` + `tsdown.config.ts` | `@libsql/client` runtime dep kept `external` | same for the new driver |

After swapping, regenerate migrations and run module tests — they verify behavior (409 on restricted delete, 400 on missing FK, search matching) end to end.

## Commands

```bash
pnpm db:push | db:generate | db:migrate | db:studio | db:check
pnpm --filter @workspace/db typecheck
pnpm --filter @workspace/db test
```
