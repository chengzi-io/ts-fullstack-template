import { createRouter } from "@tanstack/react-router";
import type { RouterHistory } from "@tanstack/react-router";

import { NotFound } from "@/components/not-found.tsx";
import { RouteError } from "@/components/route-error.tsx";
import { reportError } from "@/lib/report-error.ts";
import { routeTree } from "@/routeTree.gen.ts";

/**
 * One factory for the app and its tests, so both get the same router options:
 * a route error component, a default not-found view, and one report per caught error.
 */
export function createAppRouter({ history }: { history?: RouterHistory } = {}) {
  return createRouter({
    defaultErrorComponent: RouteError,
    defaultNotFoundComponent: NotFound,
    defaultOnCatch: (error) => reportError(error, { scope: "router" }),
    history,
    routeTree,
  });
}
