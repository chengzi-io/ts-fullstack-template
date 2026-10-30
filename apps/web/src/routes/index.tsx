import { createFileRoute, Link } from "@tanstack/react-router";
import { buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { PageHeader } from "@/components/blocks/page-header.tsx";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        description="A TypeScript full-stack monorepo template: typed RPC, feature-based UI, shared design system, and a disposable authors/posts demo (FK, dialogs, Zustand UI store)."
        title="Full-stack TypeScript template"
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-dashed bg-muted/30 px-5 py-6">
        <h2 className="font-medium text-sm">Try the demo</h2>
        <p className="max-w-prose text-muted-foreground text-sm leading-relaxed">
          Authors and posts: domain Zod, FK joins, tRPC + Query, create Dialogs,
          and Zustand for client UI intent (e.g. resume post create after author
          create). Server data stays in Query — not in the store.
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
  );
}
