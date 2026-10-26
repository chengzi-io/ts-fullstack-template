import type { RouterOutputs } from "@workspace/api";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { useCallback, useEffect } from "react";
import { useAuthorsQuery } from "@/features/authors/hooks.ts";
import {
  useAuthorActions,
  usePostActions,
  usePostDialog,
} from "@/stores/selectors.ts";
import {
  useCreatePostMutation,
  usePostQuery,
  useUpdatePostMutation,
} from "../hooks.ts";
import {
  type PostFormValues,
  postFormDefaults,
  toCreatePostInput,
  toUpdatePostInput,
} from "../model/form.ts";
import { PostForm } from "./form.tsx";

type Author = RouterOutputs["authors"]["list"]["items"][number];
type Post = RouterOutputs["posts"]["byId"];

function postDialogCopy(isEdit: boolean) {
  if (isEdit) {
    return {
      description: "Update fields via tRPC posts.update.",
      submitLabel: "Save changes",
      title: "Edit post",
    };
  }
  return {
    description: "Create via tRPC. Missing author uses Zustand resume flow.",
    submitLabel: "Create post",
    title: "New post",
  };
}

function NeedAuthorPanel({ onCreateAuthor }: { onCreateAuthor: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-dashed bg-muted/30 px-4 py-4">
      <p className="font-medium text-sm">Create an author first</p>
      <p className="text-muted-foreground text-sm">
        Opens author dialog; after success, this post dialog reopens.
      </p>
      <Button className="self-start" onClick={onCreateAuthor} type="button">
        Create author
      </Button>
    </div>
  );
}

function PostDialogBody({
  authors,
  busy,
  defaults,
  editId,
  isEdit,
  onCancel,
  onNeedAuthor,
  onSubmit,
  saveError,
  showEmptyAuthors,
  showForm,
  submitLabel,
}: {
  authors: Author[];
  busy: boolean;
  defaults: PostFormValues;
  editId: number | null;
  isEdit: boolean;
  onCancel: () => void;
  onNeedAuthor: () => void;
  onSubmit: (values: PostFormValues) => void | Promise<void>;
  saveError: { message?: string } | null;
  showEmptyAuthors: boolean;
  showForm: boolean;
  submitLabel: string;
}) {
  return (
    <>
      {showEmptyAuthors ? (
        <NeedAuthorPanel onCreateAuthor={onNeedAuthor} />
      ) : null}
      {showForm ? (
        <PostForm
          authors={authors}
          defaultValues={defaults}
          isSubmitting={busy}
          key={isEdit ? `edit-${editId}` : "create"}
          onCancel={onCancel}
          onSubmit={onSubmit}
          submitLabel={submitLabel}
        />
      ) : null}
      {saveError ? (
        <p className="text-destructive text-sm">
          {saveError.message || "Could not save post."}
        </p>
      ) : null}
    </>
  );
}

function postFormDefaultsFrom(post: Post | undefined): PostFormValues {
  if (!post) {
    return postFormDefaults;
  }
  return {
    authorId: post.authorId,
    body: post.body ?? "",
    title: post.title,
  };
}

/**
 * Controlled by `useUiStore` — mount once near the app root.
 * Authors/post queries run only while open (and edit id present for byId).
 */
export function CreatePostDialog() {
  const postDialog = usePostDialog();
  const { close } = usePostActions();
  const { openCreate: openCreateAuthor } = useAuthorActions();

  const isOpen = postDialog.mode !== "closed";
  const isEdit = postDialog.mode === "edit";
  const editId = postDialog.mode === "edit" ? postDialog.id : null;
  const copy = postDialogCopy(isEdit);

  const authorsQuery = useAuthorsQuery({ enabled: isOpen });
  const postQuery = usePostQuery(editId, { enabled: isOpen && isEdit });
  const createMutation = useCreatePostMutation();
  const updateMutation = useUpdatePostMutation();
  const authors = authorsQuery.data?.items ?? [];
  const busy = createMutation.isPending || updateMutation.isPending;
  const saveError = createMutation.error ?? updateMutation.error ?? null;

  const showEmptyAuthors =
    !isEdit && authorsQuery.isSuccess && authors.length === 0;
  const showForm =
    authorsQuery.isSuccess &&
    authors.length > 0 &&
    (!isEdit || postQuery.isSuccess);

  // `reset` is stable; the mutation result object is new on every render, so
  // depending on it re-runs this effect, and reset() re-renders — a loop.
  const { reset: resetCreate } = createMutation;
  const { reset: resetUpdate } = updateMutation;

  useEffect(() => {
    if (!isOpen) {
      resetCreate();
      resetUpdate();
    }
  }, [isOpen, resetCreate, resetUpdate]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        close();
      }
    },
    [close]
  );

  const handleSubmit = useCallback(
    async (values: PostFormValues) => {
      if (postDialog.mode === "edit") {
        await updateMutation.mutateAsync(
          toUpdatePostInput(postDialog.id, values)
        );
      } else {
        await createMutation.mutateAsync(toCreatePostInput(values));
      }
      close();
    },
    [close, createMutation, postDialog, updateMutation]
  );

  const handleNeedAuthor = useCallback(() => {
    openCreateAuthor({ resumeAfterAuthor: "create-post" });
  }, [openCreateAuthor]);

  const defaults = isEdit
    ? postFormDefaultsFrom(postQuery.data)
    : postFormDefaults;

  const loading = authorsQuery.isPending || (isEdit && postQuery.isPending);
  const loadError = authorsQuery.isError || (isEdit && postQuery.isError);

  return (
    <Dialog onOpenChange={handleOpenChange} open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : null}
        {loadError ? (
          <p className="text-destructive text-sm">Could not load data.</p>
        ) : null}

        <PostDialogBody
          authors={authors}
          busy={busy}
          defaults={defaults}
          editId={editId}
          isEdit={isEdit}
          onCancel={close}
          onNeedAuthor={handleNeedAuthor}
          onSubmit={handleSubmit}
          saveError={saveError}
          showEmptyAuthors={showEmptyAuthors}
          showForm={showForm}
          submitLabel={busy ? "Saving…" : copy.submitLabel}
        />
      </DialogContent>
    </Dialog>
  );
}
