import { type ErrorComponentProps, useRouter } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { useCallback } from "react";
import { queryClient } from "@/lib/query-client.ts";
import { errorMessage, reportError, requestIdOf } from "@/lib/report-error.ts";

/**
 * The fallback for an error a feature could not show inline. Reporting happens
 * once, in the router's `defaultOnCatch` (see `lib/router.ts`).
 */
export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const requestId = requestIdOf(error);

  const handleRetry = useCallback(() => {
    // Drop the cached failure before remounting, or the route renders the same
    // bad data and throws again.
    queryClient
      .resetQueries({ type: "all" })
      .catch((cause) => reportError(cause, { scope: "route-error" }));
    reset();
    router
      .invalidate()
      .catch((cause) => reportError(cause, { scope: "route-error" }));
  }, [reset, router]);

  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-4">
      <p className="font-medium text-destructive text-sm">
        Something went wrong
      </p>
      <p className="mt-1 text-muted-foreground text-sm">
        {errorMessage(error)}
      </p>
      {requestId ? (
        <p className="mt-1 text-muted-foreground text-xs">
          Request id: {requestId}
        </p>
      ) : null}
      <Button className="mt-4" onClick={handleRetry} type="button">
        Try again
      </Button>
    </div>
  );
}
