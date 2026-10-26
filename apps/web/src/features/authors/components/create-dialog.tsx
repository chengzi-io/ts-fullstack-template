import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { useCallback, useEffect } from "react";
import { useAuthorActions, useAuthorDialog } from "@/stores/selectors.ts";
import {
  useAuthorQuery,
  useCreateAuthorMutation,
  useUpdateAuthorMutation,
} from "../hooks.ts";
import {
  type AuthorFormValues,
  authorFormDefaults,
  toCreateAuthorInput,
  toUpdateAuthorInput,
} from "../model/form.ts";
import { AuthorForm } from "./form.tsx";

function authorDialogCopy(opts: {
  isEdit: boolean;
  resumeAfterAuthor: string | null;
}): { description: string; submitLabel: string; title: string } {
  if (opts.resumeAfterAuthor === "create-post") {
    return {
      description: "After create, the post dialog will reopen.",
      submitLabel: "Create author",
      title: "New author",
    };
  }
  if (opts.isEdit) {
    return {
      description: "Update via tRPC authors.update.",
      submitLabel: "Save changes",
      title: "Edit author",
    };
  }
  return {
    description: "Authors own posts via authorId.",
    submitLabel: "Create author",
    title: "New author",
  };
}

/**
 * Controlled by `useUiStore` — mount once near the app root.
 * Fetches `byId` only while open + editing; resets mutation errors on close.
 */
export function CreateAuthorDialog() {
  const authorDialog = useAuthorDialog();
  const { close, completeCreate } = useAuthorActions();

  const isOpen = authorDialog.mode !== "closed";
  const isEdit = authorDialog.mode === "edit";
  const editId = authorDialog.mode === "edit" ? authorDialog.id : null;
  const resumeAfterAuthor =
    authorDialog.mode === "create" ? authorDialog.resumeAfterAuthor : null;
  const copy = authorDialogCopy({ isEdit, resumeAfterAuthor });

  const authorQuery = useAuthorQuery(editId, { enabled: isOpen && isEdit });
  const createMutation = useCreateAuthorMutation();
  const updateMutation = useUpdateAuthorMutation();
  const busy = createMutation.isPending || updateMutation.isPending;
  const saveError = createMutation.error ?? updateMutation.error;
  const showForm = !isEdit || authorQuery.isSuccess;

  const resetMutations = useCallback(() => {
    createMutation.reset();
    updateMutation.reset();
  }, [createMutation, updateMutation]);

  useEffect(() => {
    if (!isOpen) {
      resetMutations();
    }
  }, [isOpen, resetMutations]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        close();
      }
    },
    [close]
  );

  const handleSubmit = useCallback(
    async (values: AuthorFormValues) => {
      if (authorDialog.mode === "edit") {
        await updateMutation.mutateAsync(
          toUpdateAuthorInput(authorDialog.id, values)
        );
        close();
        return;
      }
      await createMutation.mutateAsync(toCreateAuthorInput(values));
      completeCreate();
    },
    [authorDialog, close, completeCreate, createMutation, updateMutation]
  );

  const defaults: AuthorFormValues =
    isEdit && authorQuery.data
      ? { name: authorQuery.data.name }
      : authorFormDefaults;

  return (
    <Dialog onOpenChange={handleOpenChange} open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {isEdit && authorQuery.isPending ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : null}

        {isEdit && authorQuery.isError ? (
          <p className="text-destructive text-sm">Could not load author.</p>
        ) : null}

        {showForm ? (
          <AuthorForm
            defaultValues={defaults}
            isSubmitting={busy}
            key={isEdit ? `edit-${editId}` : "create"}
            onSubmit={handleSubmit}
            submitLabel={busy ? "Saving…" : copy.submitLabel}
          />
        ) : null}

        {saveError ? (
          <p className="text-destructive text-sm">
            {saveError.message || "Could not save author."}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
