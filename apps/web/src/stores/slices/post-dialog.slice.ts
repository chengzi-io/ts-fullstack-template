import type { StateCreator } from "zustand";

import type { StoreState } from "../types.ts";

export type PostDialog =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; id: number };

/**
 * Actions live in a stable namespace object — selecting `s.postActions` returns
 * the same reference forever, so consumers never re-render and `useShallow` is
 * unnecessary.
 */
export interface PostDialogSlice {
  postActions: {
    close: () => void;
    openCreate: () => void;
    openEdit: (id: number) => void;
  };
  postDialog: PostDialog;
}

export const createPostDialogSlice: StateCreator<
  StoreState,
  [["zustand/devtools", never]],
  [],
  PostDialogSlice
> = (set) => ({
  postActions: {
    close: () =>
      set({ postDialog: { mode: "closed" } }, false, "postDialog/close"),
    openCreate: () =>
      set({ postDialog: { mode: "create" } }, false, "postDialog/openCreate"),
    openEdit: (id) =>
      set({ postDialog: { id, mode: "edit" } }, false, "postDialog/openEdit"),
  },
  postDialog: { mode: "closed" },
});
