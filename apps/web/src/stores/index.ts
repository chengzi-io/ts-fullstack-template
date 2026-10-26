import { create } from "zustand";
import { devtools } from "zustand/middleware";

import { createAuthorDialogSlice } from "./slices/author-dialog.slice.ts";
import { createPostDialogSlice } from "./slices/post-dialog.slice.ts";
import type { StoreState } from "./types.ts";

/**
 * Client UI intent — NOT a server cache. Server data lives in TanStack Query;
 * deep-linkable UI belongs in URL search params; page-local UI stays in useState.
 *
 * One store composed from slices. Consumers must read through a selector (never
 * call `useUiStore()` bare) — prefer the named hooks in `selectors.ts`.
 */
export const useUiStore = create<StoreState>()(
  devtools(
    (...a) => ({
      ...createAuthorDialogSlice(...a),
      ...createPostDialogSlice(...a),
    }),
    { enabled: import.meta.env.DEV, name: "ui-store" }
  )
);
