import type { ErrorComponentProps } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { useCallback } from "react";
import { queryClient } from "@/lib/query-client.ts";
import { errorMessage, reportError, requestIdOf } from "@/lib/report-error.ts";

/**
 * The fallback for an error a feature could not show inline. Reporting happens
 * once, in the router's `defaultOnCatch` (see `lib/router.ts`).
 */
export function RouteError({ error, reset }: ErrorComponentProps) {
  const requestId = requestIdOf(error);

  const handleRetry = useCallback(() => {
    // Drop the cached failures before remounting, or the route renders the same
    // bad data and throws again. Successful data stays cached.
    queryClient
      .resetQueries({
        predicate: (query) => query.state.status === "error",
        type: "all",
      })
      .catch((cause) => reportError(cause, { scope: "route-error" }));
    reset();
  }, [reset]);

  return (
    <div className="border-destructive/30 bg-destructive/5 rounded-2xl border px-6 py-4">
      <p className="text-destructive text-sm font-medium">
        Something went wrong
      </p>
      <p className="text-muted-foreground mt-1 text-sm">
        {errorMessage(error)}
      </p>
      {requestId ? (
        <p className="text-muted-foreground mt-1 text-xs">
          Request id: {requestId}
        </p>
      ) : null}
      <Button className="mt-4" onClick={handleRetry} type="button">
        Try again
      </Button>
    </div>
  );
}
