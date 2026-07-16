import { createFileRoute, Link } from "@tanstack/react-router";
import { buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { PageHeader } from "@/components/layout/page-header.tsx";

export const Route = createFileRoute("/todos/")({
  component: TodosPage,
});

function TodosPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        actions={
          <Link className={cn(buttonVariants(), "inline-flex")} to="/todos/new">
            New todo
          </Link>
        }
        description="List todos via tRPC and TanStack Query, rendered with TanStack Table."
        title="Todos"
      />

      <div className="rounded-2xl border border-dashed bg-muted/30 px-6 py-10">
        <p className="font-medium text-sm">No todos yet</p>
        <p className="mt-1 max-w-sm text-muted-foreground text-sm">
          This page will load{" "}
          <code className="rounded bg-muted px-1">todos.list</code> from the API
          and show rows in a table. Create one to see Query cache updates after
          a mutation.
        </p>
        <div className="mt-4">
          <Link
            className={cn(
              buttonVariants({ variant: "outline" }),
              "inline-flex"
            )}
            to="/todos/new"
          >
            Create first todo
          </Link>
        </div>
      </div>
    </div>
  );
}
