# Remove the authors / posts demo

The scaffold ships a **disposable** demo domain so the stack is end-to-end
runnable (Zod contracts, FK join, tRPC, web list/create). It is **not** a
product starter. Delete it before (or as soon as) you add real tables.

Do **not** generate or commit migrations for this demo. Use `pnpm db:push`
while evaluating the template. After your real schema is stable, run
`pnpm db:generate` for the first project migration.

## What the demo proves

- Shared shapes in `@workspace/domain` (Zod once; types via `z.output`)
- `authors` + `posts` with `posts.authorId → authors.id` (`onDelete: restrict`)
- Repo joins so list/detail output includes `author: { id, name }`
- Invalid `authorId` on create → tRPC `BAD_REQUEST`
- Thin routers: `.input` / `.output` from domain, `ctx.repos.*` only
- Web: domain Zod for forms, `RouterOutputs` for table rows

## Delete checklist

Remove these files (or equivalent paths if you renamed them):

```text
packages/domain/src/authors.ts
packages/domain/src/posts.ts
packages/db/src/schema/authors.ts
packages/db/src/schema/posts.ts
packages/db/src/repos/authors.ts
packages/db/src/repos/posts.ts
packages/api/src/router/authors.ts
packages/api/src/router/posts.ts
packages/api/test/authors.test.ts
packages/api/test/posts.test.ts
apps/web/test/create-dialogs.test.tsx
apps/web/test/create-post-flow.test.tsx
apps/web/src/features/authors/**
apps/web/src/features/posts/**
apps/web/src/routes/posts/**
apps/web/src/routes/authors/**
apps/web/src/components/create-dialogs.tsx
apps/web/src/stores/ui.ts
```

Then edit:

| File | Change |
|------|--------|
| `packages/domain/package.json` | Drop `./authors` and `./posts` exports |
| `packages/domain/src/index.ts` | Empty or reshape `AppRepos` for your domains; drop demo type re-exports |
| `packages/db/src/repos/index.ts` | Register only your repos |
| `packages/api/src/index.ts` | Mount only your routers (empty object is fine until you add one) |
| `apps/web` nav / home | Remove Posts / Authors links (`app-shell`, `routes/index`) |
| Package `AGENTS.md` examples | Stop mentioning authors/posts as required |

## After delete

```bash
pnpm db:push          # or migrate once you have real migrations
pnpm typecheck
pnpm check
pnpm dev              # should boot with no demo procedures
```

Regenerate the web route tree by running the web dev server or build (TanStack
Router writes `apps/web/src/routeTree.gen.ts`).

## Add your domain (same pattern)

1. `packages/domain/src/<name>.ts` — Zod + `*Repo` (types from `z.output` only)
2. `packages/db/src/schema/<name>.ts` + `repos/<name>.ts`
3. `packages/api/src/router/<name>.ts` — thin procedures
4. Wire `AppRepos`, `createRepos`, `appRouter`
5. `apps/web/src/features/<name>/` + routes
6. When shape is stable: `pnpm db:generate` and commit `packages/db/drizzle/**`
