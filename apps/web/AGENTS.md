# web

Vite SPA. **Feature-first**, thin routes. Server state = tRPC + TanStack Query,
client intent = Zustand, form values = React Hook Form. Workspace map: root `AGENTS.md`.

## Import boundaries (Biome-enforced — `biome.jsonc` overrides)

- `@workspace/api`: type-import `AppRouter` / `RouterInputs` / `RouterOutputs` only
- `@workspace/db` and `@workspace/api/*` are server-only — never imported here
- Value-import Zod from module contracts: `@workspace/<module>/contract`
- A route uses a feature's `components/*`, `hooks.ts` and `store.ts` — never its `api.ts` or `model/*`
- A feature reaches another feature only through its **`api.ts`** (query options) or **`store.ts`** (actions) — e.g. posts lists authors for its picker and opens the author dialog. Never its components, hooks or model
- Dependencies between features point one way (posts → authors, never back)
- Never invalidate another feature's keys: every successful mutation invalidates all queries (`lib/query-client.ts`)
- No barrel files. The folder is the namespace

## Layer model

Four layers, each may only depend downward:

| Layer | Location | Knows domain? | Example |
|-------|----------|---------------|---------|
| primitive | `@workspace/ui/components` | no | `Button`, `Dialog` |
| block | `components/blocks` | no | `DataTable`, `PageHeader` |
| feature | `features/<domain>` | yes | `PostDialog` |
| layout | `components/layout` | orchestration (shell) | `AppShell` |

Reusable-but-domain-free UI goes to `blocks`, not into a feature. Pure layout
shells (nav/header/footer/sidebar) go to `components/layout`. Dialogs are
mounted by the routes that open them — there is no app-wide outlet, so a
feature's code ships with its route chunk.

## Feature anatomy

Every feature under `features/<domain>` follows the same shape. Files inside are
**unprefixed** — the folder already namespaces them (`table.tsx`, not `posts-table.tsx`).
Kebab-case everywhere.

```text
features/<domain>/
  api.ts          tRPC queryOptions — NO React; what other features may import
  hooks.ts        thin React wrappers over api.ts (use<Domain>Query, use...Mutation)
  store.ts        this feature's Zustand store (dialog state + actions)
  model/form.ts   Zod form schema + defaults + UI↔wire mappers (to*Input)
  components/
    table.tsx
    columns.tsx
    form.tsx
    dialog.tsx    create + edit
```

**Why split `api.ts` from `hooks.ts`:** query options are React-free, so loaders
and other features can reuse them. `hooks.ts` stays a trivial wrapper. Mutation
hooks carry no `onSuccess` cache code — refresh is global.

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
| Zustand (`features/<x>/store.ts`) | UI intent another feature or the route must drive (open this dialog, then continue) and that need not deep-link |
| `useState` | page-local (delete confirm, hover, ephemeral toggles) |
| React Hook Form | form field values — never Zustand |

Never put `posts`/`authors` rows in Zustand. Mutations refresh the cache
globally; dialogs close/resume via the store.

Dialogs pass `enabled: isOpen` (and edit id) into feature queries so closed
dialogs don't fetch, and reset mutation error state on close. Effect deps use
the stable `mutation.reset`, never the `useMutation` result object (it is new
every render — depending on it caused an app-wide re-render loop).

## Zustand conventions

**One small store per feature**, in `features/<domain>/store.ts`. No app-wide
store, so a feature adds no shared registry entry and features cannot write
each other's state.

```ts
type PostDialog = { mode: "closed" } | { mode: "create" } | { mode: "edit"; id: number };

const usePostsStore = create<PostsStore>()(devtools((set) => ({
  actions: { close, openCreate, openEdit },   // created once, never replaced
  dialog: { mode: "closed" },
}), { enabled: import.meta.env.DEV, name: "posts" }));

export const usePostDialog = () => usePostsStore((s) => s.dialog);
export const usePostActions = () => usePostsStore((s) => s.actions);
```

Rules:

1. **Export selector hooks, not the store.** Components never call the store
   with no selector (that subscribes to everything).
2. **Actions live in one `actions` object** created once — select it directly;
   no `useShallow`, no `useCallback` wrappers.
3. **Model exclusive UI as a discriminated union**, not parallel booleans.
4. **Continue another feature's flow with a callback**, not a flag naming it:
   `openCreateAuthor({ onCreated: openCreatePost })` — authors never learns
   that posts exists.
5. `devtools` middleware, DEV-only, with a `name`. Do not `persist` transient
   intent (dialogs); only persist real user preferences with `partialize`.

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

## Testing

- Render real components (Testing Library, jsdom); mock only the network
- `test/msw.ts` `trpc({ "authors.list": … })` answers `httpBatchLink` calls with
  superjson, like the API. An unhandled request fails the test
- `test/setup.ts` clears the shared `queryClient`; `__mocks__/zustand.ts`
  (Zustand's documented pattern) resets every feature store after each test
- Render a page through its route: `Route.options.component`
- Query by role / label as a user would; assert what the user or backend sees
- `test/posts-page.test.tsx` is the reference page test (demo): a full flow
  plus an idle-render guard

## Layout

```text
src/
  routes/                 thin pages (loader + render feature component)
  features/<domain>/       api.ts · hooks.ts · model/ · components/  (see anatomy)
  components/
    blocks/              domain-free reusable UI (data-table, page-header)
    layout/              pure layout shells (app-shell; future nav/sidebar/footer)
    theme-provider.tsx   global theme provider
    dev-tools.tsx         DEV-only
  hooks/                  cross-feature hooks (use-debounce, use-media-query)
  lib/                    trpc, query-client
  config/                 nav / site config, feature flags
  types/                  cross-cutting shared types
test/                     Vitest + Testing Library + MSW (see Testing)
__mocks__/zustand.ts      resets feature stores between tests
```

## Commands

```bash
pnpm --filter web typecheck
pnpm --filter web test
pnpm --filter web build
pnpm check
```
