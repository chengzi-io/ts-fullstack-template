import type { RouterOutputs } from "@workspace/api";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

type Author = RouterOutputs["authors"]["byId"];

export type AuthorDialog =
  | { mode: "closed" }
  /** `onCreated` lets another feature continue its flow without this one knowing it. */
  | { mode: "create"; onCreated?: (author: Author) => void }
  | { mode: "edit"; id: number };

interface AuthorsStore {
  /** Created once and never replaced — select it without `useShallow`. */
  actions: {
    close: () => void;
    openCreate: (options?: { onCreated?: (author: Author) => void }) => void;
    openEdit: (id: number) => void;
  };
  dialog: AuthorDialog;
}

const useAuthorsStore = create<AuthorsStore>()(
  devtools(
    (set) => ({
      actions: {
        close: () =>
          set({ dialog: { mode: "closed" } }, false, "authors/close"),
        openCreate: (options) =>
          set(
            { dialog: { mode: "create", onCreated: options?.onCreated } },
            false,
            "authors/openCreate"
          ),
        openEdit: (id) =>
          set({ dialog: { id, mode: "edit" } }, false, "authors/openEdit"),
      },
      dialog: { mode: "closed" },
    }),
    { enabled: import.meta.env.DEV, name: "authors" }
  )
);

export const useAuthorDialog = () => useAuthorsStore((s) => s.dialog);
export const useAuthorActions = () => useAuthorsStore((s) => s.actions);
