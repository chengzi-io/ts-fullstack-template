import { createFileRoute } from "@tanstack/react-router";
import { paginationInput, searchQuery } from "@workspace/kernel/pagination";
import { Button, buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { DeleteConfirmDialog } from "@/components/blocks/delete-confirm-dialog.tsx";
import { PageHeader } from "@/components/blocks/page-header.tsx";
import { AuthorDialog } from "@/features/authors/components/dialog.tsx";
import { PostDialog } from "@/features/posts/components/dialog.tsx";
import { PostsTable } from "@/features/posts/components/table.tsx";
import {
  useDeletePostMutation,
  usePostsQuery,
} from "@/features/posts/hooks.ts";
import { usePostActions } from "@/features/posts/store.ts";
import { useDebouncedValue } from "@/hooks/use-debounced-value.ts";

const SEARCH_DEBOUNCE_MS = 300;

/** The list's state lives in the URL: shareable, survives refresh and back. */
const postsSearch = z.object({
  page: paginationInput.shape.page.catch(1),
  pageSize: paginationInput.shape.pageSize.catch(20),
  q: searchQuery.catch(undefined),
});

export const Route = createFileRoute("/posts/")({
  component: PostsPage,
  validateSearch: postsSearch,
});

function PostsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const q = useDebouncedValue(search.q, SEARCH_DEBOUNCE_MS);
  const postsQuery = usePostsQuery({
    page: search.page,
    pageSize: search.pageSize,
    q,
  });
  const { refetch } = postsQuery;
  const { openCreate, openEdit } = usePostActions();
  const deleteMutation = useDeletePostMutation();
  // Page-local: delete confirm does not need global/cross-route coordination.
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const items = postsQuery.data?.items ?? [];
  const total = postsQuery.data?.total ?? 0;
  const pageCount = postsQuery.data?.pageCount ?? 0;
  const hasNoPosts = postsQuery.isSuccess && total === 0 && !search.q;

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
    refetch().catch(() => undefined);
  }, [refetch]);

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
        description="Full CRUD via tRPC. Paging and search run on the server and live in the URL; create/edit dialogs are mounted by this route."
        title="Posts"
      />

      {postsQuery.isPending ? (
        <p className="text-muted-foreground text-sm">Loading posts…</p>
      ) : null}

      {postsQuery.isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-4">
          <p className="font-medium text-destructive text-sm">
            Failed to load posts
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

      {hasNoPosts ? (
        <div className="rounded-2xl border border-dashed bg-muted/30 px-6 py-10">
          <p className="font-medium text-sm">No posts yet</p>
          <p className="mt-1 max-w-sm text-muted-foreground text-sm">
            Create a post (author required — dialog can resume after author
            create).
          </p>
          <div className="mt-4">
            <Button onClick={openCreate} type="button">
              New
            </Button>
          </div>
        </div>
      ) : null}

      {postsQuery.isSuccess && !hasNoPosts ? (
        <PostsTable
          data={items}
          onCreate={openCreate}
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
        description="This cannot be undone."
        errorMessage={deleteMutation.error?.message}
        onConfirm={handleDeleteConfirm}
        onOpenChange={handleDeleteOpenChange}
        open={deleteId !== null}
        title="Delete post?"
      />

      {/* The post dialog can hand off to the author dialog, so mount both. */}
      <PostDialog />
      <AuthorDialog />
    </div>
  );
}
