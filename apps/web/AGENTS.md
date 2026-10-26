# web

Vite SPA. **Feature-first**, thin routes. Server state = tRPC + TanStack Query,
client intent = Zustand, form values = React Hook Form. Workspace map: root `AGENTS.md`.

## Import boundaries (enforced)

- Type-import `AppRouter` / `RouterInputs` / `RouterOutputs` from `@workspace/api` — never value-import the package root
- Value-import Zod only from `@workspace/domain/*` — never `@workspace/db`
- A route may import a feature's **`components/*` and `hooks.ts` only**. Never its `api.ts` or `model/*`
- Features must not import another feature's internals. The one legal cross-feature link is **`api.ts` → another `api.ts`** for shared query keys / invalidation (e.g. authors invalidates the posts list). Do this via the exported `*ListQueryFilter`, never a hand-rolled key
- No barrel files. The folder is the namespace

## Layer model

Four layers, each may only depend downward:

| Layer | Location | Knows domain? | Example |
|-------|----------|---------------|---------|
| primitive | `@workspace/ui/components` | no | `Button`, `Dialog` |
| block | `components/blocks` | no | `DataTable`, `PageHeader` |
| feature | `features/<domain>` | yes | `CreatePostDialog` |
| layout | `components/layout` | orchestration (shell) | `AppShell` |
| app | `components/app` | orchestration (outlets) | `CreateDialogs` |

Reusable-but-domain-free UI goes to `blocks`, not into a feature. Pure layout
shells (nav/header/footer/sidebar) go to `components/layout`. Cross-feature
orchestration outlets (root-mounted dialogs, resume flows) go to `components/app`.

## Feature anatomy

Every feature under `features/<domain>` follows the same shape. Files inside are
**unprefixed** — the folder already namespaces them (`table.tsx`, not `posts-table.tsx`).
Kebab-case everywhere.

```text
features/<domain>/
  api.ts          tRPC queryOptions + <domain>ListQueryFilter + invalidate<Domain>()  — NO React
  hooks.ts        thin React wrappers over api.ts (use<Domain>Query, use...Mutation)
  model/form.ts   Zod form schema + defaults + UI↔wire mappers (to*Input)
  components/
    table.tsx
    columns.tsx
    form.tsx
    create-dialog.tsx
```

**Why split `api.ts` from `hooks.ts`:** cache/invalidation strategy is the part
that grows and needs testing; keeping it React-free makes it unit-testable and
importable by another feature's `api.ts`. `hooks.ts` stays a trivial wrapper.

### model/form.ts — the schema seam

Compose form schemas from domain inputs; never redeclare fields. UI-only shapes
(`""` vs `null`, `valueAsNumber`) live here as `to*Input` mappers, so components
and the wire never disagree.

```ts
export const postFormSchema = createPostInput.pick({ authorId: true, title: true })
  .extend({ body: z.string().optional() }); // UI "" → wire null in toCreatePostInput
```

## Server state vs client intent

| Put it in… | When |
|------------|------|
| TanStack Query | any server data (lists, byId, mutations, cache) |
| URL search param | dialog/filter that should survive refresh, deep-link, back button |
| Zustand (`stores/`) | intent that is cross-feature AND root-mounted AND not deep-linkable |
| `useState` | page-local (delete confirm, hover, ephemeral toggles) |
| React Hook Form | form field values — never Zustand |

Never put `posts`/`authors` rows in Zustand. After a mutation, invalidate Query
and close/resume dialogs via the store.

Root-mounted dialogs pass `enabled: isOpen` (and edit id) into feature queries so
closed dialogs don't fetch, and reset mutation error state on close.

## Zustand conventions

One store, composed from **slices** by concern. Never one flat god-interface.

```text
stores/
  index.ts            create() + devtools + spread every slice
  types.ts            StoreState = DialogSlice & NavSlice & ...
  selectors.ts        named selector hooks (the public read API)
  slices/
    dialog.slice.ts   StateCreator<StoreState, [], [], DialogSlice>
```

Rules:

1. **Always select a slice, never the whole store.** `useUiStore()` with no
   selector subscribes to everything and re-renders on any change — banned.
   Single value: `useUiStore((s) => s.postDialog)`. Multiple values: wrap in
   `useShallow`. Prefer the named selector hooks in `selectors.ts` so components
   don't hand-write subscriptions.
2. **Actions are reference-stable** — Zustand never recreates them. Do not wrap
   them in `useCallback` and do not list them in effect deps for that reason.
3. **Model exclusive UI as a discriminated union**, not parallel booleans:
   `{ mode: "closed" } | { mode: "create" } | { mode: "edit"; id: number }`.
4. `devtools` middleware, DEV-only, with a `name`. Do not `persist` transient
   intent (dialogs); only persist real user preferences with `partialize`.
5. Each slice owns one concern. Cross-slice writes go through the combined
   `StoreState` typing on `StateCreator`, not a second store.

## shadcn / component conventions

Primitives live in `@workspace/ui`; they are the vocabulary, not your canvas.

1. **Never fork a primitive for a one-off.** Extend via `cva` variants
   (`VariantProps`) or composition. Edit `@workspace/ui` only to change the
   design system for everyone.
2. **Forward `className` and merge with `cn()`** on every wrapper so callers can override.
3. **Compose with slots, not boolean explosions.** `<Dialog><DialogContent>…`
   beats a `PostDialog` with eight `is*` props. Use Radix `asChild` for
   polymorphism (button-as-link) instead of duplicating a component.
4. **Controlled dialogs**: `open` + `onOpenChange`; reset the form and mutation
   error when closing.
5. **Accessibility is required, not optional**: every `DialogContent` has a
   title; icon-only buttons get `aria-label` / `sr-only`; forms use the `Field`
   / `FieldLabel` / `FieldError` primitives.
6. **Table columns** are built by a `create<Domain>Columns({ onEdit, onDelete })`
   factory in `columns.tsx`, memoized where consumed, driven by `DataTable`.

## Dev tools

`components/dev-tools.tsx` mounts only under `import.meta.env.DEV`: Router
Devtools, Query Devtools, Agentation. Guarded so nothing ships to prod; these
stay in `devDependencies`.

## Layout

```text
src/
  routes/                 thin pages (loader + render feature component)
  features/<domain>/       api.ts · hooks.ts · model/ · components/  (see anatomy)
  components/
    blocks/              domain-free reusable UI (data-table, page-header)
    layout/              pure layout shells (app-shell; future nav/sidebar/footer)
    app/                 cross-feature outlets (create-dialogs)
    theme-provider.tsx   global theme provider
    dev-tools.tsx         DEV-only
  stores/                 Zustand slices (see conventions)
  hooks/                  cross-feature hooks (use-debounce, use-media-query)
  lib/                    trpc, query-client
  config/                 nav / site config, feature flags
  types/                  cross-cutting shared types
```

## Commands

```bash
pnpm --filter web typecheck
pnpm --filter web build
pnpm check
```
