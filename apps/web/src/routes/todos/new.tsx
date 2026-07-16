import { createFileRoute, Link } from "@tanstack/react-router";
import { buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { PageHeader } from "@/components/layout/page-header.tsx";

export const Route = createFileRoute("/todos/new")({
  component: NewTodoPage,
});

function NewTodoPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        actions={
          <Link
            className={cn(
              buttonVariants({ variant: "outline" }),
              "inline-flex"
            )}
            to="/todos"
          >
            Back to list
          </Link>
        }
        description="Create a todo with React Hook Form and Zod, submitted through tRPC."
        title="New todo"
      />

      <div className="rounded-2xl border border-dashed bg-muted/30 px-6 py-10">
        <p className="font-medium text-sm">Form coming online</p>
        <p className="mt-1 max-w-sm text-muted-foreground text-sm">
          Fields will validate with Zod (aligned with the API input schema) and
          call <code className="rounded bg-muted px-1">todos.create</code>. On
          success you return to the list with Query invalidation.
        </p>
      </div>
    </div>
  );
}
