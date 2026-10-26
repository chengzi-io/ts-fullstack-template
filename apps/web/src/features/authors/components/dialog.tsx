import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { useCallback, useEffect } from "react";
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
import { useAuthorActions, useAuthorDialog } from "../store.ts";
import { AuthorForm } from "./form.tsx";

function authorDialogCopy(isEdit: boolean): {
  description: string;
  submitLabel: string;
  title: string;
} {
  if (isEdit) {
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
 * Controlled by the authors store; mounted by each route that opens it.
 * Fetches `byId` only while open + editing; resets mutation errors on close.
 */
export function AuthorDialog() {
  const authorDialog = useAuthorDialog();
  const { close } = useAuthorActions();

  const isOpen = authorDialog.mode !== "closed";
  const isEdit = authorDialog.mode === "edit";
  const editId = authorDialog.mode === "edit" ? authorDialog.id : null;
  const copy = authorDialogCopy(isEdit);

  const authorQuery = useAuthorQuery(editId, { enabled: isOpen && isEdit });
  const createMutation = useCreateAuthorMutation();
  const updateMutation = useUpdateAuthorMutation();
  const busy = createMutation.isPending || updateMutation.isPending;
  const saveError = createMutation.error ?? updateMutation.error;
  const showForm = !isEdit || authorQuery.isSuccess;

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
    async (values: AuthorFormValues) => {
      if (authorDialog.mode === "edit") {
        await updateMutation.mutateAsync(
          toUpdateAuthorInput(authorDialog.id, values)
        );
        close();
        return;
      }
      const author = await createMutation.mutateAsync(
        toCreateAuthorInput(values)
      );
      close();
      if (authorDialog.mode === "create") {
        authorDialog.onCreated?.(author);
      }
    },
    [authorDialog, close, createMutation, updateMutation]
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
