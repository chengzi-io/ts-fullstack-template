# Remove the authors / posts demo

The `authors` and `posts` modules are a disposable reference to verify the stack end to end. Delete them before or right after adding your first real module.

- Do **not** generate or commit migrations for the demo; use `pnpm db:push` during evaluation, then `pnpm db:generate` once your real schema stabilizes.
- **Tip:** scaffold your first module by copying `modules/authors` **before** deleting the demo (see `modules/AGENTS.md`).

## Delete checklist

Delete these files and directories:

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

Retarget these two non-demo tests to your first module before deleting the demo:

- `apps/web/test/errors.test.tsx` — tests `lib/report-error.ts` and the route error boundary via the posts page
- `apps/web/e2e/critical-flow.e2e.ts` — critical-flow E2E test ([DECISIONS #14](./DECISIONS.md#14-one-e2e-test-covering-the-critical-flow)) via creating an author and post

If you have no real module yet, delete both. Note that `pnpm e2e` and the CI `e2e` job will fail until a module with tables and a critical flow exists (`drizzle-kit` finds no schemas to push).

Then update:

| File | Change |
| --- | --- |
| `packages/api/src/index.ts` | Remove demo imports and `appRouter` entries (empty router is valid) |
| `packages/api/package.json`, `apps/web/package.json` | Remove `@workspace/authors` and `@workspace/posts` |
| `apps/web/src/components/layout/app-shell.tsx` | Remove Posts / Authors nav links |
| `apps/web/src/routes/index.tsx` | Remove "Try the demo" card and demo text in `PageHeader` |
| `README.md` | Remove "try `/authors`, then `/posts`" in Quick start and the `Disposable demo` section |

Drizzle config and `createTestDb()` discover schemas by glob, and kernel/server tests use their own routers, so nothing else requires edits.

Optional non-breaking doc/test references to clean up later:

- `.github/ISSUE_TEMPLATE/bug_report.yml` — `/posts` example in reproduction steps
- `apps/server/README.md` — `authors.*` / `posts.*` demo note in the endpoint table
- `apps/server/Dockerfile` — `# demo, no migrations` comment
- `apps/web/test/query-client.test.ts` — dummy `posts` / `authors` query keys

## After deleting

```bash
pnpm install                        # drop removed workspace packages
pnpm --filter web exec vite build   # regenerate src/routeTree.gen.ts
pnpm fix                            # remove unused imports from index.tsx
pnpm typecheck && pnpm check && pnpm test
pnpm db:push                        # once your first module has tables
```

Run `vite build` before `typecheck` so TanStack Router regenerates `routeTree.gen.ts` without the deleted routes.

## What the demo covered

- Capability modules (`modules/authors`, `modules/posts`: contract → schema → repo → router → tests)
- One-way module dependency and FK restrict (`posts.authorId → authors.id`, `onDelete: restrict`)
- Constraint-driven errors: missing author → `BAD_REQUEST`; deleting an author with posts → `CONFLICT`
- Repo join embedding `author: { id, name }` in post outputs
- Web patterns: contract-derived forms, `RouterOutputs`, per-feature stores, cross-feature dialog hand-off (`onCreated`)
