# @workspace/api

Composition only: `appRouter` mounts each module's router and exports types for the web. Procedures and logic live in `modules/<domain>/src/router.ts`.

```ts
export const appRouter = createTRPCRouter({
  authors: authorsRouter,
  posts: postsRouter,
});
export type AppRouter = typeof appRouter; // + RouterInputs / RouterOutputs
```

- Add a module: declare it in `package.json` and add one line to `appRouter`.
- `apps/server` mounts `appRouter`; `apps/web` type-imports `AppRouter` / `RouterInputs` / `RouterOutputs` only (Oxlint-enforced).
- Modules never import `@workspace/api` (Oxlint-enforced).

```bash
pnpm --filter @workspace/api typecheck
```
