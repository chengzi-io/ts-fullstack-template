import type { AuthorDialogSlice } from "./slices/author-dialog.slice.ts";
import type { PostDialogSlice } from "./slices/post-dialog.slice.ts";

/**
 * The full store shape = every slice intersected. Slices reference this so a
 * `StateCreator<StoreState, ...>` can read/write across slices when a flow spans
 * concerns (e.g. completeAuthorCreate touches both dialogs). Add new slices here.
 */
export type StoreState = AuthorDialogSlice & PostDialogSlice;
