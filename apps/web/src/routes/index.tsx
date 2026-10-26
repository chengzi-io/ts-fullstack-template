import { createFileRoute, Link } from "@tanstack/react-router";
import { buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { PageHeader } from "@/components/blocks/page-header.tsx";

export const Route = createFileRoute("/")({
  component: HomePage,
});

interface StackItem {
  detail: string;
  name: string;
}

interface StackGroup {
  description: string;
  items: StackItem[];
  title: string;
}

const STACK_GROUPS: StackGroup[] = [
  {
    description: "Workspace layout and shared tooling.",
    items: [
      { detail: "apps/* · packages/*", name: "pnpm workspaces" },
      { detail: "dev · build · typecheck · test", name: "Turborepo" },
      { detail: "Strict mode across packages", name: "TypeScript" },
    ],
    title: "Monorepo",
  },
  {
    description: "SPA client in apps/web — feature-based.",
    items: [
      { detail: "UI runtime", name: "React 19" },
      { detail: "Dev server & bundler", name: "Vite" },
      { detail: "File-based routes", name: "TanStack Router" },
      { detail: "Server state", name: "TanStack Query" },
      {
        detail: "Client UI intent (create/edit dialogs · resume)",
        name: "Zustand",
      },
      {
        detail: "DataTable · sort · filter · page size",
        name: "TanStack Table",
      },
      { detail: "Typed RPC to AppRouter", name: "tRPC client" },
      { detail: "Forms + validation UX", name: "React Hook Form" },
      { detail: "Schemas shared with the API", name: "Zod" },
    ],
    title: "Web app",
  },
  {
    description: "Shared primitives for web (and future clients).",
    items: [
      { detail: "packages/ui · base-rhea", name: "shadcn/ui" },
      { detail: "Tokens & utilities", name: "Tailwind CSS v4" },
      { detail: "Accessible primitives", name: "Base UI" },
      { detail: "Variable font", name: "DM Sans" },
      { detail: "Icons", name: "Lucide" },
    ],
    title: "Design system",
  },
  {
    description: "Contract-first backend without OpenAPI codegen.",
    items: [
      { detail: "apps/server HTTP host", name: "Hono" },
      { detail: "packages/api · AppRouter", name: "tRPC" },
      { detail: "Dates & richer types", name: "SuperJSON" },
      { detail: "packages/db", name: "Drizzle ORM" },
      { detail: "Local-first template DB", name: "libSQL / SQLite" },
    ],
    title: "API & data",
  },
  {
    description:
      "Format, lint, hooks, and tests (planned items land as product hardens).",
    items: [
      { detail: "Biome preset", name: "Ultracite" },
      { detail: "Pre-commit fix", name: "Lefthook" },
      { detail: "Unit & integration", name: "Vitest" },
      { detail: "Component tests · planned", name: "Testing Library" },
      { detail: "DOM environment · planned", name: "jsdom" },
      { detail: "API mocks · planned", name: "MSW" },
      { detail: "End-to-end · planned", name: "Playwright" },
      { detail: "A11y in E2E · planned", name: "axe-core" },
    ],
    title: "Quality",
  },
  {
    description: "Tools enabled only in development.",
    items: [
      { detail: "Route tree & matches", name: "Router Devtools" },
      { detail: "Cache & mutations", name: "Query Devtools" },
      { detail: "UI notes → markdown for AI", name: "Agentation" },
    ],
    title: "Developer experience",
  },
];

function HomePage() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-6">
        <PageHeader
          description="A TypeScript full-stack monorepo template: typed RPC, feature-based UI, shared design system, and a disposable authors/posts demo (FK, dialogs, Zustand UI store)."
          title="Full-stack TypeScript template"
        />

        <div className="flex flex-col gap-3 rounded-2xl border border-dashed bg-muted/30 px-5 py-6">
          <h2 className="font-medium text-sm">Try the demo</h2>
          <p className="max-w-prose text-muted-foreground text-sm leading-relaxed">
            Authors and posts: domain Zod, FK joins, tRPC + Query, create
            Dialogs, and Zustand for client UI intent (e.g. resume post create
            after author create). Server data stays in Query — not in the store.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link className={cn(buttonVariants(), "inline-flex")} to="/posts">
              Go to Posts
            </Link>
            <Link
              className={cn(
                buttonVariants({ variant: "outline" }),
                "inline-flex"
              )}
              to="/authors"
            >
              Authors
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="stack-heading" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2
            className="font-medium text-base tracking-tight"
            id="stack-heading"
          >
            Tech stack
          </h2>
          <p className="max-w-prose text-muted-foreground text-sm">
            Everything the template is built to ship with — web, API, data, and
            quality gates.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {STACK_GROUPS.map((group) => (
            <article
              className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs"
              key={group.title}
            >
              <header className="flex flex-col gap-0.5">
                <h3 className="font-medium text-sm">{group.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {group.description}
                </p>
              </header>
              <ul className="flex flex-col gap-2">
                {group.items.map((item) => (
                  <li
                    className="flex items-baseline justify-between gap-3 border-border/60 border-b border-dashed pb-2 last:border-b-0 last:pb-0"
                    key={item.name}
                  >
                    <span className="font-medium text-sm">{item.name}</span>
                    <span className="text-right text-muted-foreground text-xs">
                      {item.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
