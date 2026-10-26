import type { RouterOutputs } from "@workspace/api";
import type { AuthorSummary } from "@workspace/authors/contract";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthorActions } from "@/features/authors/store.ts";
import { useDebouncedValue } from "@/hooks/use-debounced-value.ts";
import {
  useAuthorOptionsQuery,
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
import { usePostActions, usePostDialog } from "../store.ts";
import { PostForm } from "./form.tsx";

const AUTHOR_SEARCH_DEBOUNCE_MS = 300;
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
  authorSearch,
  authors,
  busy,
  defaults,
  editId,
  isEdit,
  onAuthorSearchChange,
  onCancel,
  onNeedAuthor,
  onSubmit,
  saveError,
  showEmptyAuthors,
  showForm,
  submitLabel,
}: {
  authorSearch: string;
  authors: AuthorSummary[];
  busy: boolean;
  defaults: PostFormValues;
  editId: number | null;
  isEdit: boolean;
  onAuthorSearchChange: (search: string) => void;
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
          authorSearch={authorSearch}
          authors={authors}
          defaultValues={defaults}
          isSubmitting={busy}
          key={isEdit ? `edit-${editId}` : "create"}
          onAuthorSearchChange={onAuthorSearchChange}
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
 * Controlled by the posts store; mounted by each route that opens it.
 * Authors/post queries run only while open (and edit id present for byId).
 */
export function PostDialog() {
  const postDialog = usePostDialog();
  const { close, openCreate } = usePostActions();
  const { openCreate: openCreateAuthor } = useAuthorActions();

  const isOpen = postDialog.mode !== "closed";
  const isEdit = postDialog.mode === "edit";
  const editId = postDialog.mode === "edit" ? postDialog.id : null;
  const copy = postDialogCopy(isEdit);

  const [authorSearch, setAuthorSearch] = useState("");
  const debouncedAuthorSearch = useDebouncedValue(
    authorSearch,
    AUTHOR_SEARCH_DEBOUNCE_MS
  );
  const authorsQuery = useAuthorOptionsQuery(debouncedAuthorSearch, {
    enabled: isOpen,
  });
  const postQuery = usePostQuery(editId, { enabled: isOpen && isEdit });
  const createMutation = useCreatePostMutation();
  const updateMutation = useUpdatePostMutation();
  const busy = createMutation.isPending || updateMutation.isPending;
  const saveError = createMutation.error ?? updateMutation.error ?? null;

  const matches = authorsQuery.data?.items;
  const postAuthor = isEdit ? postQuery.data?.author : undefined;
  // Editing keeps the post's own author selectable even when a search hides it.
  const authors = useMemo(() => {
    const found = matches ?? [];
    if (!postAuthor || found.some((author) => author.id === postAuthor.id)) {
      return found;
    }
    return [postAuthor, ...found];
  }, [matches, postAuthor]);

  const noAuthorsAtAll =
    authorsQuery.isSuccess && authors.length === 0 && !debouncedAuthorSearch;
  const showEmptyAuthors = !isEdit && noAuthorsAtAll;
  const showForm =
    authorsQuery.isSuccess &&
    !noAuthorsAtAll &&
    (!isEdit || postQuery.isSuccess);

  // `reset` is stable; the mutation result object is new on every render, so
  // depending on it re-runs this effect, and reset() re-renders — a loop.
  const { reset: resetCreate } = createMutation;
  const { reset: resetUpdate } = updateMutation;

  useEffect(() => {
    if (!isOpen) {
      resetCreate();
      resetUpdate();
      setAuthorSearch("");
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
    // Reopen once the author exists, in case this dialog closed meanwhile.
    openCreateAuthor({ onCreated: openCreate });
  }, [openCreate, openCreateAuthor]);

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
          authorSearch={authorSearch}
          authors={authors}
          busy={busy}
          defaults={defaults}
          editId={editId}
          isEdit={isEdit}
          onAuthorSearchChange={setAuthorSearch}
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
