import { createRouter, type RouterHistory } from "@tanstack/react-router";
import { RouteError } from "@/components/route-error.tsx";
import { reportError } from "@/lib/report-error.ts";
import { routeTree } from "@/routeTree.gen.ts";

/**
 * One factory for the app and its tests, so both get the same router options:
 * a route error component everywhere and one report per caught error.
 */
export function createAppRouter({ history }: { history?: RouterHistory } = {}) {
  return createRouter({
    defaultErrorComponent: RouteError,
    defaultOnCatch: (error) => reportError(error, { scope: "router" }),
    history,
    routeTree,
  });
}
