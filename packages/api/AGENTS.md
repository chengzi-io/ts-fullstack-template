# @workspace/api

Composition only: `appRouter` mounts one router per module and exports the types the web consumes. No procedures and no logic live here — those are in `modules/<domain>/src/router.ts`.

```ts
export const appRouter = createTRPCRouter({
  authors: authorsRouter,
  posts: postsRouter,
});
export type AppRouter = typeof appRouter; // + RouterInputs / RouterOutputs
```

- Adding a module: a `package.json` dependency + one line above
- `apps/server` mounts `appRouter`; `apps/web` type-imports `AppRouter` / `RouterInputs` / `RouterOutputs` only (Oxlint-enforced)
- Modules never import this package (Oxlint-enforced) — it sits above them

```bash
pnpm --filter @workspace/api typecheck
```
