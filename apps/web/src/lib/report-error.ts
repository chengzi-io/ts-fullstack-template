/** Errors already reported: the query cache and a route boundary can both see one. */
const reportedErrors = new WeakSet<object>();

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The API puts a `requestId` on every tRPC error; support needs it verbatim. */
export function requestIdOf(error: unknown): string | null {
  // Duck-typed on purpose: importing @trpc/client here would pull the tRPC
  // client into the entry chunk.
  const requestId = (error as { data?: { requestId?: unknown } } | null)?.data
    ?.requestId;
  return typeof requestId === "string" ? requestId : null;
}

/**
 * The API marks a domain failure (a missing row, a conflict, an unknown
 * reference) `expected`: the feature that made the call shows it inline.
 */
export function isExpectedError(error: unknown): boolean {
  // Duck-typed like requestIdOf.
  const expected = (error as { data?: { expected?: unknown } } | null)?.data
    ?.expected;
  return expected === true;
}

/**
 * The single place the app reports an unexpected error — a failed query or
 * mutation, or one a route error boundary caught. Features keep showing
 * expected errors inline; this is only for the ones nobody planned for.
 *
 * An error object is reported once, whichever seam sees it first.
 *
 * This is the seam an error tracker plugs into: forward `message`,
 * `requestId`, `context` and `error` from here.
 */
export function reportError(error: unknown, context?: Record<string, unknown>) {
  if (typeof error === "object" && error !== null) {
    if (reportedErrors.has(error)) {
      return;
    }
    reportedErrors.add(error);
  }
  console.error("Unexpected error:", errorMessage(error), {
    context,
    error,
    requestId: requestIdOf(error),
  });
}
