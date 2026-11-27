# @workspace/kernel

Module SDK shared by all `modules/<domain>`. No business logic, no env, never imports modules.

| Export | Contents | Used by |
| --- | --- | --- |
| `./trpc` | `publicProcedure`, `protectedProcedure`, `createTRPCRouter`, `createCallerFactory` (maps domain errors → tRPC codes, logs every call with driver root cause on 500s, never logs SQL or sends stacks) | modules, api |
| `./context` | `createTRPCContext({ db, log, requestId, session? })`, `Logger` | server |
| `./errors` | `NotFoundError`, `ConflictError`, `InvalidReferenceError`, `rootCause(error)` | module repos, server |
| `./pagination` | `paginationInput`, `paginatedOutput`, `toPaginatedResult` (browser-safe) | module contracts |
| `./testing` | `createTestContext()`, `silentLogger` | module tests |

## Rules

- Add a domain error in three places: class in `errors.ts`, entry in `domainErrorCode` (`trpc.ts`), test in `test/trpc.test.ts`.
- `protectedProcedure` checks `ctx.session.user`; the template ships no auth, so the host populates `session` once auth is added.
- Kernel tests use a local test router, never a demo module.

```bash
pnpm --filter @workspace/kernel test
pnpm --filter @workspace/kernel typecheck
```
