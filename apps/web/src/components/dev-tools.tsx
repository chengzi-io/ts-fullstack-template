import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Agentation } from "agentation";

/**
 * Dev-only overlays (lazy-loaded from `__root` when `import.meta.env.DEV`).
 * Router tree, Query cache, Agentation UI → markdown for AI agents.
 */
export function DevTools() {
  return (
    <>
      <TanStackRouterDevtools position="bottom-right" />
      <ReactQueryDevtools buttonPosition="bottom-left" initialIsOpen={false} />
      <Agentation />
    </>
  );
}
