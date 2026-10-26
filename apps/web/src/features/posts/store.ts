import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type PostDialog =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; id: number };

interface PostsStore {
  /** Created once and never replaced — select it without `useShallow`. */
  actions: {
    close: () => void;
    openCreate: () => void;
    openEdit: (id: number) => void;
  };
  dialog: PostDialog;
}

const usePostsStore = create<PostsStore>()(
  devtools(
    (set) => ({
      actions: {
        close: () => set({ dialog: { mode: "closed" } }, false, "posts/close"),
        openCreate: () =>
          set({ dialog: { mode: "create" } }, false, "posts/openCreate"),
        openEdit: (id) =>
          set({ dialog: { id, mode: "edit" } }, false, "posts/openEdit"),
      },
      dialog: { mode: "closed" },
    }),
    { enabled: import.meta.env.DEV, name: "posts" }
  )
);

export const usePostDialog = () => usePostsStore((s) => s.dialog);
export const usePostActions = () => usePostsStore((s) => s.actions);
