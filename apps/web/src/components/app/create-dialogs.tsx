import { CreateAuthorDialog } from "@/features/authors/components/create-dialog.tsx";
import { CreatePostDialog } from "@/features/posts/components/create-dialog.tsx";

/**
 * Mount once under QueryClientProvider (see `__root`).
 * Create/edit dialogs are global UI intent (Zustand); each dialog owns its queries
 * and only fetches while open.
 */
export function CreateDialogs() {
  return (
    <>
      <CreatePostDialog />
      <CreateAuthorDialog />
    </>
  );
}
