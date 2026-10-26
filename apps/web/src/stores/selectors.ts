import { useUiStore } from "./index.ts";

/**
 * Named selector hooks are the public read API of the store. Components use
 * these instead of hand-writing selectors, so subscriptions stay narrow.
 *
 * State hooks select one value (re-render only when it changes).
 * Action hooks select the stable `actions` namespace — the object reference
 * never changes, so no re-render and no `useShallow` needed.
 */

export const usePostDialog = () => useUiStore((s) => s.postDialog);
export const useAuthorDialog = () => useUiStore((s) => s.authorDialog);

export const usePostActions = () => useUiStore((s) => s.postActions);
export const useAuthorActions = () => useUiStore((s) => s.authorActions);
