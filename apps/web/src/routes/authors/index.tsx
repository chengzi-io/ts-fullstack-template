import { createFileRoute } from "@tanstack/react-router";
import { paginationInput, searchQuery } from "@workspace/kernel/pagination";
import { Button, buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { DeleteConfirmDialog } from "@/components/blocks/delete-confirm-dialog.tsx";
import { PageHeader } from "@/components/blocks/page-header.tsx";
import { AuthorDialog } from "@/features/authors/components/dialog.tsx";
import { AuthorsTable } from "@/features/authors/components/table.tsx";
import {
  useAuthorsQuery,
  useDeleteAuthorMutation,
} from "@/features/authors/hooks.ts";
import { useAuthorActions } from "@/features/authors/store.ts";
import { useDebouncedValue } from "@/hooks/use-debounced-value.ts";

const SEARCH_DEBOUNCE_MS = 300;

/** The list's state lives in the URL: shareable, survives refresh and back. */
const authorsSearch = z.object({
  page: paginationInput.shape.page.catch(1),
  pageSize: paginationInput.shape.pageSize.catch(20),
  q: searchQuery.catch(undefined),
});

export const Route = createFileRoute("/authors/")({
  component: AuthorsPage,
  validateSearch: authorsSearch,
});

function AuthorsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const q = useDebouncedValue(search.q, SEARCH_DEBOUNCE_MS);
  const authorsQuery = useAuthorsQuery({
    page: search.page,
    pageSize: search.pageSize,
    q,
  });
  const { openCreate, openEdit } = useAuthorActions();
  const deleteMutation = useDeleteAuthorMutation();
  // Page-local: delete confirm does not need global/cross-route coordination.
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const items = authorsQuery.data?.items ?? [];
  const total = authorsQuery.data?.total ?? 0;
  const pageCount = authorsQuery.data?.pageCount ?? 0;
  const hasNoAuthors = authorsQuery.isSuccess && total === 0 && !search.q;

  // Deleting the last row of the last page (or a hand-edited URL) can leave
  // the page past the end; step back to the last real page.
  useEffect(() => {
    if (pageCount > 0 && search.page > pageCount) {
      navigate({
        replace: true,
        search: (prev) => ({ ...prev, page: pageCount }),
      });
    }
  }, [navigate, pageCount, search.page]);

  const handlePageChange = useCallback(
    (page: number) => {
      navigate({ search: (prev) => ({ ...prev, page }) });
    },
    [navigate]
  );

  const handlePageSizeChange = useCallback(
    (pageSize: number) => {
      navigate({ search: (prev) => ({ ...prev, page: 1, pageSize }) });
    },
    [navigate]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      navigate({
        replace: true,
        search: (prev) => ({ ...prev, page: 1, q: value || undefined }),
      });
    },
    [navigate]
  );

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
      <PageHeader description="People who write posts." title="Authors" />

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

      {hasNoAuthors ? (
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

      {authorsQuery.isSuccess && !hasNoAuthors ? (
        <AuthorsTable
          data={items}
          onCreate={handleNew}
          onDelete={handleDeleteRequest}
          onEdit={openEdit}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onSearchChange={handleSearchChange}
          page={search.page}
          pageSize={search.pageSize}
          search={search.q ?? ""}
          total={total}
        />
      ) : null}

      <DeleteConfirmDialog
        busy={deleteMutation.isPending}
        description="This cannot be undone. Authors with posts can't be deleted."
        errorMessage={deleteMutation.error?.message}
        onConfirm={handleDeleteConfirm}
        onOpenChange={handleDeleteOpenChange}
        open={deleteId !== null}
        title="Delete author?"
      />

      <AuthorDialog />
    </div>
  );
}
