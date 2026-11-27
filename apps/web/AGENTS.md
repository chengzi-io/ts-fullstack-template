# web

Vite SPA. Feature-first, thin routes. Server state = tRPC + TanStack Query; client UI intent = Zustand; form values = React Hook Form. Workspace map: root `AGENTS.md`.

## Layout

```text
src/
  routes/                 thin pages; component useQuery via hooks.ts (opt-in loader only)
  features/<domain>/      api.ts · hooks.ts · store.ts · model/ · components/
  components/
    blocks/               domain-free reusable UI (data-table, page-header)
    layout/               pure layout shells (app-shell holds nav links)
    theme-provider.tsx    global theme provider
    dev-tools.tsx         DEV-only devtools
  hooks/                  cross-feature hooks (use-debounced-value.ts)
  lib/                    trpc.ts · query-client.ts · router.ts · report-error.ts
  config/                 placeholder (.gitkeep); nav links live in components/layout/app-shell.tsx
  types/                  cross-cutting shared types
test/                     Vitest + Testing Library + MSW
__mocks__/zustand.ts      resets feature stores between tests
```

## Layers & import boundaries

Four layers, downward dependencies only:

| Layer | Location | Knows domain? | Example |
| --- | --- | --- | --- |
| primitive | `@workspace/ui/components` | no | `Button`, `Dialog` |
| block | `components/blocks` | no | `DataTable`, `PageHeader` |
| feature | `features/<domain>` | yes | `PostDialog` |
| layout | `components/layout` | orchestration (shell) | `AppShell` |

Put domain-free reusable UI in `components/blocks`, and pure layout shells (nav/header/footer/sidebar) in `components/layout`. Mount dialogs in the routes that open them (no app-wide outlet, so feature code stays in its route chunk).

**Oxlint-enforced boundaries (`oxlint.config.mts`):**

- `@workspace/api`: type-import `AppRouter` / `RouterInputs` / `RouterOutputs` only.
- Never import `@workspace/db` or `@workspace/api/*` (server-only).
- Value-import Zod schemas from `@workspace/<module>/contract`.
- Routes import a feature's `components/*`, `hooks.ts`, `store.ts`, plus `api.ts` only inside an opt-in route `loader`; never `model/*`.
- Cross-feature imports are one-way (`posts` → `authors`), absolute (`@/features/<domain>/api` or `@/features/<domain>/store`), and never touch another feature's components, hooks, or model. Relative `../` / `../../` escapes out of a feature folder are errors.
- `components/blocks/*` cannot import `features/*`, `routes/*`, or `components/layout/*`.
- No barrel files.

**Runtime boundaries:**

- Never manually invalidate another feature's query keys: every successful mutation invalidates all queries (`lib/query-client.ts`).
- Unexpected errors (failed query/mutation, route crash) go through `lib/report-error.ts`. Expected domain errors carry `data.expected` from the API, are skipped by the query cache, and are shown inline by features.

## Feature anatomy & post-demo skeleton

Files inside `features/<domain>` are unprefixed kebab-case (`table.tsx`, not `posts-table.tsx`):

```text
features/<domain>/
  api.ts          React-free tRPC queryOptions (only query file other features may import)
  hooks.ts        thin React wrappers over api.ts (use<Domain>Query, use...Mutation)
  store.ts        feature Zustand store (dialog state + actions)
  model/form.ts   Zod form schema + defaults + UI↔wire mappers (to*Input)
  components/     table.tsx · columns.tsx · form.tsx · dialog.tsx (create + edit)
```

- **`api.ts` vs `hooks.ts` & route loaders:** Keep `api.ts` React-free so loaders and other features can reuse query options. Mutation hooks carry no `onSuccess` cache invalidation. Routes default to component `useQuery` via `hooks.ts`; opt into a route `loader` only for data-heavy initial render, hover preloading, or detail-page 404 interception, calling `queryClient.ensureQueryData(queryOptions(...))` with `api.ts` (never `hooks.ts`).
- **`model/form.ts`:** Derive form schemas from contract inputs (`pick` / `extend`); never redeclare fields. Put UI-only transforms (`""` → `null`, `valueAsNumber`) in `to*Input` mappers.

Canonical shape (authoritative reference after `docs/REMOVE-DEMO.md` removes `authors` and `posts`):

```ts
// api.ts — React-free query options; importable by other features and opt-in loaders
export const postQueryOptions = (id: number) =>
  queryOptions({
    queryKey: trpc.posts.byId.queryKey({ id }),
    queryFn: () => trpc.posts.byId.query({ id }),
  });

// hooks.ts — thin wrapper, no cache or error-reporting code
export const usePostQuery = (id: number | null) =>
  useQuery({ ...postQueryOptions(id ?? 0), enabled: id !== null });

// store.ts — one small store per feature; export selector hooks, not the store
type PostDialog =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; id: number };

const usePostsStore = create<PostsStore>()(
  devtools(
    (set) => ({
      actions: { close, openCreate, openEdit }, // created once, never replaced
      dialog: { mode: "closed" },
    }),
    { enabled: import.meta.env.DEV, name: "posts" }
  )
);
export const usePostDialog = () => usePostsStore((s) => s.dialog);
export const usePostActions = () => usePostsStore((s) => s.actions);

// model/form.ts — derive from contract; UI↔wire mapping here
export const postFormSchema = createPostInput
  .pick({ authorId: true, title: true })
  .extend({ body: z.string().optional() });
export const toCreatePostInput = (values: PostForm): CreatePostInput => ({
  ...values,
  body: values.body || null,
});
```

## State & Zustand

| Put it in | When |
| --- | --- |
| TanStack Query | Server data (lists, byId, mutations, cache) |
| URL search params (`validateSearch`) | `page` / `pageSize` / `q` and state that should survive refresh, deep-link, or back navigation |
| Zustand (`features/<x>/store.ts`) | Cross-feature or route-driven UI intent (open dialog, resume flow) that need not deep-link |
| `useState` | Page-local ephemeral state (delete confirm, hover, toggles) |
| React Hook Form | Form field values (never Zustand) |

- Never store server rows (`posts`, `authors`) in Zustand.
- Dialog queries pass `enabled: isOpen` (and edit id) so closed dialogs don't fetch, and reset form + mutation error state on close. Put the stable `mutation.reset` in effect deps, never the `useMutation` result object (a new reference each render causes a re-render loop).

**Zustand rules (one store per feature, no app-wide store):**

1. Export selector hooks, never the store itself (prevents whole-store subscriptions).
2. Group actions in one `actions` object created once (no `useShallow` or `useCallback`).
3. Model exclusive UI states as a discriminated union, not parallel booleans.
4. Continue cross-feature flows via callbacks (`openCreateAuthor({ onCreated: openCreatePost })`) so `authors` never knows `posts` exists.
5. Enable `devtools` in `DEV` only with a `name`. Never `persist` transient UI intent; persist only real user preferences with `partialize`.

## UI primitives, tables & feedback

- **Primitives (`@workspace/ui`):** Do not fork primitives for one-offs; extend with `cva` variants (`VariantProps`) or composition. Edit `@workspace/ui` only for workspace-wide design-system changes. Forward `className` and merge with `cn()`.
- **Adding primitives:** `apps/web/components.json` exists only for shadcn monorepo resolution and `@shadcn/lint`. Always run `shadcn add` inside `packages/ui` (see `packages/ui/AGENTS.md`), never in `apps/web`.
- **Base UI composition:** Primitives use Base UI, not Radix (no `asChild`). Style a link as a button with `Link` + `buttonVariants()` (`routes/index.tsx`); customize triggers with `render={<Button … />}` (`columns.tsx`). Prefer slot composition over boolean props.
- **Controlled dialogs & accessibility:** Use `open` + `onOpenChange` and reset form/errors on close. Every `DialogContent` requires a title, icon-only buttons require `aria-label` or `sr-only`, and forms use `Field` / `FieldLabel` / `FieldError`.
- **Tables & server paging:** Build columns with a memoized `create<Domain>Columns({ onEdit, onDelete })` factory in `columns.tsx` and render via `DataTable`. `DataTable` displays one server-paged/searched page and never sorts or filters locally. Keep `page` / `pageSize` / `q` in URL params (debounce search with `hooks/use-debounced-value.ts`). Never fetch all rows — pickers search too (see post form's author field).
- **Paging edge cases:** When a delete empties the current page, step back to the last page (`routes/posts/index.tsx` for URL state; mirror in local state for paged dialogs). Use `placeholderData: keepPreviousData` only while paging/searching the same list; remount when the parent entity changes.
- **Toasts (`@workspace/ui/components/toast`):** `<Toaster />` is mounted once in `src/routes/__root.tsx` (Base UI `Toast` + shared `toastManager`). Use `toast.success(title, opts?)`, `toast.error(…)`, `toast.info(…)`, `toast.add(…)`, or `toast.promise(…)` for non-dialog feedback. Do not duplicate errors already shown by `RouteError` or an inline banner. `test/setup.ts` calls `toast.dismissAll()` after each test.
- **Dev tools:** `components/dev-tools.tsx` (Router Devtools, Query Devtools, Agentation) mounts only under `import.meta.env.DEV` and never in Vitest (`MODE === "test"`, because Agentation patches window timers); keep them in `devDependencies`.

## Testing

- Render real components with Testing Library + jsdom; mock only the network.
- `test/msw.ts` `trpc({ "authors.list": … })` answers `httpBatchLink` requests with SuperJSON; unhandled requests fail the test.
- `test/setup.ts` resets `queryClient` and dismisses toasts; `__mocks__/zustand.ts` resets feature stores after each test.
- Render pages via `Route.options.component`, query by role/label, and assert visible or backend outcomes.
- `test/posts-page.test.tsx` is the reference demo page test (full CRUD flow + idle-render guard).

## Commands

```bash
pnpm --filter web typecheck
pnpm --filter web test
pnpm --filter web build
pnpm check
```

After adding or removing files under `src/routes/`, run `pnpm --filter web build` (or the dev server) to regenerate `src/routeTree.gen.ts` before running `typecheck`.
