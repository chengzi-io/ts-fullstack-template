# @workspace/kernel

The module SDK — what every `modules/<domain>` builds on. No business logic,
no env. Never imports a module: the kernel sits below them.

| Export | What | Used by |
|--------|------|---------|
| `./trpc` | `publicProcedure` / `protectedProcedure`, `createTRPCRouter`, `createCallerFactory`. Maps domain errors → tRPC codes, logs every procedure (driver-level root cause on 500s, never SQL), never sends stacks | modules, api |
| `./context` | `createTRPCContext({ db, log, requestId, session? })`, `Logger` | server |
| `./errors` | `NotFoundError` · `ConflictError` · `InvalidReferenceError` | module repos |
| `./pagination` | `paginationInput`, `paginatedOutput`, `toPaginatedResult` — browser-safe | module contracts |
| `./testing` | `createTestContext()`, `silentLogger` | module tests |

## Rules

- A new domain error = a class in `errors.ts`, one line in `domainErrorCode`
  (`trpc.ts`), and a case in `test/trpc.test.ts`
- `protectedProcedure` checks `ctx.session.user`; the template ships no auth —
  the host fills `session` once a product chooses one
- Kernel tests use their own tiny router — never a demo module

```bash
pnpm --filter @workspace/kernel test
pnpm --filter @workspace/kernel typecheck
```
