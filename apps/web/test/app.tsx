import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render } from "@testing-library/react";
import { Profiler } from "react";

import { routeTree } from "@/routeTree.gen.ts";

const ignoreCommit = () => undefined;

/**
 * The real app — routes, URL search params, shell, providers — at `url`.
 * `onCommit` sees every React commit (for idle-render guards).
 */
export function renderApp(url: string, onCommit: () => void = ignoreCommit) {
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: [url] }),
    routeTree,
  });
  render(
    <Profiler id="app" onRender={onCommit}>
      <RouterProvider router={router} />
    </Profiler>
  );
  return router;
}
