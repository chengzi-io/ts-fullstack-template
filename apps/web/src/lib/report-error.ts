import { isTRPCClientError } from "@trpc/client";

/** The API puts a `requestId` on every tRPC error; support needs it verbatim. */
export function requestIdOf(error: unknown): string | null {
  if (!isTRPCClientError(error)) {
    return null;
  }
  const requestId = (error.data as { requestId?: unknown } | undefined)
    ?.requestId;
  return typeof requestId === "string" ? requestId : null;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The single place the app reports an unexpected error — a failed query or
 * mutation, or one a route error boundary caught. Features keep showing
 * expected errors inline; this is only for the ones nobody planned for.
 *
 * This is the seam an error tracker plugs into: forward `message`,
 * `requestId`, `context` and `error` from here.
 */
export function reportError(error: unknown, context?: Record<string, unknown>) {
  const message = errorMessage(error);
  console.error("Unexpected error:", message, {
    context,
    error,
    requestId: requestIdOf(error),
  });
}
