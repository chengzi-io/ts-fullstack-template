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
import {
  type PostDialog as PostDialogState,
  usePostActions,
  usePostDialog,
} from "../store.ts";
import { PostForm } from "./form.tsx";

const AUTHOR_SEARCH_DEBOUNCE_MS = 300;
type Post = RouterOutputs["posts"]["byId"];

function postDialogCopy(isEdit: boolean) {
  if (isEdit) {
    return {
      description: "Update the title, body, or author.",
      submitLabel: "Save changes",
      title: "Edit post",
    };
  }
  return {
    description: "Write a post and pick its author.",
    submitLabel: "Create post",
    title: "New post",
  };
}

function NeedAuthorPanel({ onCreateAuthor }: { onCreateAuthor: () => void }) {
  return (
    <div className="bg-muted/30 flex flex-col gap-3 rounded-2xl border border-dashed px-4 py-4">
      <p className="text-sm font-medium">Create an author first</p>
      <p className="text-muted-foreground text-sm">
        Every post needs an author. You'll come back here after creating one.
      </p>
      <Button className="self-start" onClick={onCreateAuthor} type="button">
        Create author
      </Button>
    </div>
  );
}

/**
 * The author field's options: a debounced server search, plus the post's own
 * author when editing. The search clears when the dialog closes.
 */
function useAuthorPicker(
  enabled: boolean,
  postAuthor: AuthorSummary | undefined
) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, AUTHOR_SEARCH_DEBOUNCE_MS);
  const query = useAuthorOptionsQuery(debouncedSearch, { enabled });

  const matches = query.data?.items;
  // Editing keeps the post's own author selectable even when a search hides it.
  const authors = useMemo(() => {
    const found = matches ?? [];
    if (!postAuthor || found.some((author) => author.id === postAuthor.id)) {
      return found;
    }
    return [postAuthor, ...found];
  }, [matches, postAuthor]);

  useEffect(() => {
    if (!enabled) {
      setSearch("");
    }
  }, [enabled]);

  return {
    authors,
    noAuthorsAtAll: query.isSuccess && authors.length === 0 && !debouncedSearch,
    query,
    setSearch,
  };
}

/** Creates or updates by the dialog's mode; save errors reset when it closes. */
function useSavePost(dialog: PostDialogState, onSaved: () => void) {
  const createMutation = useCreatePostMutation();
  const updateMutation = useUpdatePostMutation();

  // `reset` is stable; the mutation result object is new on every render, so
  // depending on it re-runs this effect, and reset() re-renders — a loop.
  const { reset: resetCreate } = createMutation;
  const { reset: resetUpdate } = updateMutation;
  const isOpen = dialog.mode !== "closed";

  useEffect(() => {
    if (!isOpen) {
      resetCreate();
      resetUpdate();
    }
  }, [isOpen, resetCreate, resetUpdate]);

  const save = useCallback(
    async (values: PostFormValues) => {
      if (dialog.mode === "edit") {
        await updateMutation.mutateAsync(toUpdatePostInput(dialog.id, values));
      } else {
        await createMutation.mutateAsync(toCreatePostInput(values));
      }
      onSaved();
    },
    [createMutation, dialog, onSaved, updateMutation]
  );

  return {
    busy: createMutation.isPending || updateMutation.isPending,
    error: createMutation.error ?? updateMutation.error ?? null,
    save,
  };
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

  const postQuery = usePostQuery(editId, { enabled: isOpen && isEdit });
  const {
    authors,
    noAuthorsAtAll,
    query: authorsQuery,
    setSearch: setAuthorSearch,
  } = useAuthorPicker(isOpen, isEdit ? postQuery.data?.author : undefined);
  const {
    busy,
    error: saveError,
    save: handleSubmit,
  } = useSavePost(postDialog, close);

  const showEmptyAuthors = !isEdit && noAuthorsAtAll;
  const showForm =
    authorsQuery.isSuccess &&
    !noAuthorsAtAll &&
    (!isEdit || postQuery.isSuccess);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        close();
      }
    },
    [close]
  );

  const handleNeedAuthor = useCallback(() => {
    // Reopen once the author exists, in case this dialog closed meanwhile.
    openCreateAuthor({ onCreated: openCreate });
  }, [openCreate, openCreateAuthor]);

  const defaults = isEdit
    ? postFormDefaultsFrom(postQuery.data)
    : postFormDefaults;

  const formKey = isEdit ? `edit-${editId}` : "create";
  const submitLabel = busy ? "Saving…" : copy.submitLabel;
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

        {showEmptyAuthors ? (
          <NeedAuthorPanel onCreateAuthor={handleNeedAuthor} />
        ) : null}
        {showForm ? (
          <PostForm
            authors={authors}
            defaultValues={defaults}
            isSubmitting={busy}
            key={formKey}
            onAuthorSearchChange={setAuthorSearch}
            onCancel={close}
            onSubmit={handleSubmit}
            submitLabel={submitLabel}
          />
        ) : null}
        {saveError ? (
          <p className="text-destructive text-sm">
            {saveError.message || "Could not save post."}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
