import { createFileRoute } from "@tanstack/react-router";
import { Button, buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { useCallback, useState } from "react";
import { DeleteConfirmDialog } from "@/components/blocks/delete-confirm-dialog.tsx";
import { PageHeader } from "@/components/blocks/page-header.tsx";
import { AuthorsTable } from "@/features/authors/components/table.tsx";
import {
  useAuthorsQuery,
  useDeleteAuthorMutation,
} from "@/features/authors/hooks.ts";
import { useAuthorActions } from "@/stores/selectors.ts";

export const Route = createFileRoute("/authors/")({
  component: AuthorsPage,
});

function AuthorsPage() {
  const authorsQuery = useAuthorsQuery();
  const { openCreate, openEdit } = useAuthorActions();
  const deleteMutation = useDeleteAuthorMutation();
  // Page-local: delete confirm does not need global/cross-route coordination.
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const items = authorsQuery.data?.items ?? [];
  const isEmpty = authorsQuery.isSuccess && items.length === 0;

  const handleRetry = useCallback(() => {
    authorsQuery.refetch().catch(() => undefined);
  }, [authorsQuery]);

  const handleNew = useCallback(() => {
    openCreate();
  }, [openCreate]);

  const handleDeleteRequest = useCallback((id: number) => {
    setDeleteId(id);
  }, []);

  const handleDeleteOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setDeleteId(null);
        deleteMutation.reset();
      }
    },
    [deleteMutation]
  );

  const handleDeleteConfirm = useCallback(() => {
    if (deleteId === null) {
      return;
    }
    deleteMutation.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          setDeleteId(null);
        },
      }
    );
  }, [deleteId, deleteMutation]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        description="Full CRUD via tRPC + DataTable (sort / filter / client pagination). Delete is blocked while the author still has posts."
        title="Authors"
      />

      {authorsQuery.isPending ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : null}

      {authorsQuery.isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-4">
          <p className="font-medium text-destructive text-sm">
            Failed to load authors
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
          <p className="font-medium text-sm">No authors yet</p>
          <p className="mt-1 text-muted-foreground text-sm">
            Create one to attach posts.
          </p>
          <Button className="mt-4" onClick={handleNew} type="button">
            New
          </Button>
        </div>
      ) : null}

      {authorsQuery.isSuccess && items.length > 0 ? (
        <AuthorsTable
          data={items}
          onCreate={handleNew}
          onDelete={handleDeleteRequest}
          onEdit={openEdit}
        />
      ) : null}

      <DeleteConfirmDialog
        busy={deleteMutation.isPending}
        description="Blocked if this author still has posts (FK restrict)."
        errorMessage={deleteMutation.error?.message}
        onConfirm={handleDeleteConfirm}
        onOpenChange={handleDeleteOpenChange}
        open={deleteId !== null}
        title="Delete author?"
      />
    </div>
  );
}
