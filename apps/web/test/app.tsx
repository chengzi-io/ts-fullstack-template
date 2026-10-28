import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { render } from "@testing-library/react";
import { Profiler } from "react";

import { createAppRouter } from "@/lib/router.ts";

const ignoreCommit = () => undefined;

/**
 * The real app — routes, URL search params, shell, providers — at `url`.
 * `onCommit` sees every React commit (for idle-render guards).
 */
export function renderApp(url: string, onCommit: () => void = ignoreCommit) {
  const router = createAppRouter({
    history: createMemoryHistory({ initialEntries: [url] }),
  });
  render(
    <Profiler id="app" onRender={onCommit}>
      <RouterProvider router={router} />
    </Profiler>
  );
  return router;
}
