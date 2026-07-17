import { createFileRoute, Link } from "@tanstack/react-router";
import { buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header.tsx";
import { useTodosQuery } from "@/features/todos/hooks.ts";

export const Route = createFileRoute("/todos/")({
  component: TodosPage,
});

const priorityLabel: Record<number, string> = {
  0: "Low",
  1: "Medium",
  2: "High",
};

function TodosPage() {
  const todosQuery = useTodosQuery();
  const { refetch } = todosQuery;
  const items = todosQuery.data?.items ?? [];
  const isEmpty = todosQuery.isSuccess && items.length === 0;

  const handleRetry = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        actions={
          <Link className={cn(buttonVariants(), "inline-flex")} to="/todos/new">
            New todo
          </Link>
        }
        description="List todos via tRPC and TanStack Query. TanStack Table lands next."
        title="Todos"
      />

      {todosQuery.isPending ? (
        <p className="text-muted-foreground text-sm">Loading todos…</p>
      ) : null}

      {todosQuery.isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-4">
          <p className="font-medium text-destructive text-sm">
            Failed to load todos
          </p>
          <p className="mt-1 text-muted-foreground text-sm">
            Is <code className="rounded bg-muted px-1">apps/server</code>{" "}
            running on port 3000? Vite proxies{" "}
            <code className="rounded bg-muted px-1">/trpc</code> there.
          </p>
          <button
            className={cn(
              buttonVariants({ variant: "outline" }),
              "mt-3 inline-flex"
            )}
            onClick={handleRetry}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : null}

      {isEmpty ? (
        <div className="rounded-2xl border border-dashed bg-muted/30 px-6 py-10">
          <p className="font-medium text-sm">No todos yet</p>
          <p className="mt-1 max-w-sm text-muted-foreground text-sm">
            The list query succeeded with an empty page. Create a todo to see
            rows from <code className="rounded bg-muted px-1">todos.list</code>.
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
      ) : null}

      {todosQuery.isSuccess && items.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-xs">
            {todosQuery.data.total} total · page {todosQuery.data.page} of{" "}
            {todosQuery.data.pageCount}
          </p>
          <ul className="divide-y rounded-2xl border">
            {items.map((todo) => (
              <li
                className="flex items-start justify-between gap-4 px-4 py-3"
                key={todo.id}
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span
                    className={cn(
                      "font-medium text-sm",
                      todo.completed && "text-muted-foreground line-through"
                    )}
                  >
                    {todo.title}
                  </span>
                  {todo.description ? (
                    <span className="truncate text-muted-foreground text-xs">
                      {todo.description}
                    </span>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5 text-muted-foreground text-xs">
                  <span>{priorityLabel[todo.priority] ?? todo.priority}</span>
                  <span>{todo.completed ? "Done" : "Open"}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
