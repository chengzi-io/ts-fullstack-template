import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { useCallback } from "react";

interface DeleteConfirmDialogProps {
  busy?: boolean;
  description: string;
  errorMessage?: string | null;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}

/**
 * Page-local confirm dialog (controlled by route `useState`, not Zustand).
 * Keep delete intent next to the list that owns the row.
 */
export function DeleteConfirmDialog({
  busy = false,
  description,
  errorMessage,
  onConfirm,
  onOpenChange,
  open,
  title,
}: DeleteConfirmDialogProps) {
  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-sm" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {errorMessage ? (
          <p className="text-destructive text-sm">{errorMessage}</p>
        ) : null}
        <DialogFooter>
          <Button
            disabled={busy}
            onClick={handleCancel}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={busy}
            onClick={onConfirm}
            type="button"
            variant="destructive"
          >
            {busy ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
