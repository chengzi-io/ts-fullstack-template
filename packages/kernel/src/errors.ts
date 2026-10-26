/**
 * Expected failures a repo throws. The API maps each class to one tRPC code
 * in a single middleware, so routers carry no error handling.
 */

/** The addressed row does not exist. → NOT_FOUND */
export class NotFoundError extends Error {
  override name = "NotFoundError";
}

/** The write conflicts with existing data, e.g. a restricted delete. → CONFLICT */
export class ConflictError extends Error {
  override name = "ConflictError";
}

/** A field points at a row that does not exist, e.g. an unknown authorId. → BAD_REQUEST */
export class InvalidReferenceError extends Error {
  override name = "InvalidReferenceError";
}

/**
 * Deepest cause, for logs: the driver error names the failure (e.g.
 * CLIENT_CLOSED) without the SQL and params that ORM wrappers add.
 */
export function rootCause(error: unknown): unknown {
  let current: unknown = error;
  while (current instanceof Error && current.cause !== undefined) {
    current = current.cause;
  }
  return current;
}
