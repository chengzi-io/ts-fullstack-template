import { createFileRoute } from "@tanstack/react-router";
import { Button, buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { useCallback, useState } from "react";
import { DeleteConfirmDialog } from "@/components/blocks/delete-confirm-dialog.tsx";
import { PageHeader } from "@/components/blocks/page-header.tsx";
import { PostsTable } from "@/features/posts/components/table.tsx";
import {
  useDeletePostMutation,
  usePostsQuery,
} from "@/features/posts/hooks.ts";
import { usePostActions } from "@/stores/selectors.ts";

export const Route = createFileRoute("/posts/")({
  component: PostsPage,
});

function PostsPage() {
  const postsQuery = usePostsQuery();
  const { refetch } = postsQuery;
  const { openCreate, openEdit } = usePostActions();
  const deleteMutation = useDeletePostMutation();
  // Page-local: delete confirm does not need global/cross-route coordination.
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const items = postsQuery.data?.items ?? [];
  const isEmpty = postsQuery.isSuccess && items.length === 0;

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
        description="Full CRUD via tRPC. Create/edit use root dialogs; list uses DataTable (sort / filter / client pagination)."
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

      {isEmpty ? (
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

      {postsQuery.isSuccess && items.length > 0 ? (
        <PostsTable
          data={items}
          onCreate={openCreate}
          onDelete={handleDeleteRequest}
          onEdit={openEdit}
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
    </div>
  );
}
