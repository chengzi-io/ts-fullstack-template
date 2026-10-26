import type { StateCreator } from "zustand";

import type { StoreState } from "../types.ts";

/** After creating an author, optionally resume post create. */
export type ResumeAfterAuthor = "create-post" | null;

export type AuthorDialog =
  | { mode: "closed" }
  | { mode: "create"; resumeAfterAuthor: ResumeAfterAuthor }
  | { mode: "edit"; id: number };

/**
 * Actions live in a stable namespace object — selecting `s.authorActions`
 * returns the same reference forever, so consumers never re-render and
 * `useShallow` is unnecessary.
 */
export interface AuthorDialogSlice {
  authorActions: {
    close: () => void;
    /** Author create succeeded; reopens post create when resume was set. */
    completeCreate: () => void;
    openCreate: (opts?: { resumeAfterAuthor?: ResumeAfterAuthor }) => void;
    openEdit: (id: number) => void;
  };
  authorDialog: AuthorDialog;
}

/**
 * `completeCreate` reads `authorDialog` and writes `postDialog` across slices
 * via the shared `StoreState` generic — idiomatic cross-slice coordination
 * without an event bus.
 */
export const createAuthorDialogSlice: StateCreator<
  StoreState,
  [["zustand/devtools", never]],
  [],
  AuthorDialogSlice
> = (set, get) => ({
  authorActions: {
    close: () =>
      set({ authorDialog: { mode: "closed" } }, false, "authorDialog/close"),

    completeCreate: () => {
      const dialog = get().authorDialog;
      const resume = dialog.mode === "create" ? dialog.resumeAfterAuthor : null;
      if (resume === "create-post") {
        set(
          { authorDialog: { mode: "closed" }, postDialog: { mode: "create" } },
          false,
          "authorDialog/completeCreate/resume"
        );
        return;
      }
      set(
        { authorDialog: { mode: "closed" } },
        false,
        "authorDialog/completeCreate"
      );
    },

    openCreate: (opts) =>
      set(
        {
          authorDialog: {
            mode: "create",
            resumeAfterAuthor: opts?.resumeAfterAuthor ?? null,
          },
        },
        false,
        "authorDialog/openCreate"
      ),

    openEdit: (id) =>
      set(
        { authorDialog: { id, mode: "edit" } },
        false,
        "authorDialog/openEdit"
      ),
  },
  authorDialog: { mode: "closed" },
});
