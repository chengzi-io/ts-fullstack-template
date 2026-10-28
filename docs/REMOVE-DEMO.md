# Remove the authors / posts demo

The scaffold ships a **disposable** demo so the stack is end-to-end runnable
(Zod contracts, FK join, tRPC, web list/create). It is **not** a product
starter. Delete it before (or as soon as) you add real modules.

Do **not** generate or commit migrations for this demo. Use `pnpm db:push`
while evaluating the template. After your real schema is stable, run
`pnpm db:generate` for the first project migration.

Tip: scaffold your first module by copying `modules/authors` **before**
deleting the demo (see `modules/AGENTS.md`).

## What the demo proves

- One module per capability: `modules/authors`, `modules/posts`
  (contract → schema → repo → router → tests)
- `posts.authorId → authors.id` (`onDelete: restrict`); posts depends on
  authors, never the reverse
- Constraint-driven errors: unknown author → `BAD_REQUEST`; deleting an author
  that still has posts → `CONFLICT`
- A repo join, so post output embeds `author: { id, name }`
- Web: module contracts for forms, `RouterOutputs` for rows, per-feature
  stores, and a cross-feature dialog hand-off (`onCreated`)

## Delete checklist

Delete:

```text
modules/authors/
modules/posts/
apps/web/src/features/authors/
apps/web/src/features/posts/
apps/web/src/routes/authors/
apps/web/src/routes/posts/
apps/web/test/authors-page.test.tsx
apps/web/test/posts-page.test.tsx
```

Two tests are not demo code but use the demo as their subject. Move them to
your first module (see the tip above) before deleting the demo:

- `apps/web/test/errors.test.tsx` — the error-reporting seam
  (`lib/report-error.ts`, the route error boundary), through the posts page
- `apps/web/e2e/critical-flow.e2e.ts` — the one E2E test
  ([DECISIONS 14](./DECISIONS.md)), through creating an author and a post

Without a module yet, delete both. `pnpm e2e` and the CI `e2e` job then fail
until your first module and its critical flow exist: the E2E setup pushes the
module schemas to a fresh database, and drizzle-kit finds none.

Then edit:

| File | Change |
|------|--------|
| `packages/api/src/index.ts` | Remove the two module imports and their `appRouter` lines (an empty router is fine) |
| `packages/api/package.json`, `apps/web/package.json` | Remove `@workspace/authors` and `@workspace/posts` |
| `apps/web/src/components/layout/app-shell.tsx` | Remove the Posts / Authors nav links |
| `apps/web/src/routes/index.tsx` | Remove the "Try the demo" card and the demo from the `PageHeader` description |
| `README.md` | Remove "try `/authors`, then `/posts`" from Quick start and the "Disposable demo" section |

Nothing else names the demo: the drizzle config and `createTestDb()` discover
module schemas by path, and the kernel and server tests use their own routers.

## After delete

```bash
pnpm install                        # drop the removed workspace packages
pnpm --filter web exec vite build   # regenerates src/routeTree.gen.ts
pnpm fix                            # drops imports the removed card used
pnpm typecheck && pnpm check && pnpm test
pnpm db:push                        # once your first module has tables
```

`vite build` must run before `typecheck`: until TanStack Router regenerates
`routeTree.gen.ts`, it still imports the deleted routes.
