import { createTestDb } from "@workspace/db/testing";

import { createTRPCContext } from "./context.js";
import type { Logger, Session } from "./context.js";

export const silentLogger: Logger = {
  debug: () => {
    /* noop */
  },
  error: () => {
    /* noop */
  },
  info: () => {
    /* noop */
  },
  warn: () => {
    /* noop */
  },
};

/**
 * Real context on a fresh temp SQLite (every module's schema). Pair with
 * `createCallerFactory(router)(ctx)`; call `dispose` after the test.
 */
export async function createTestContext(
  options: { log?: Logger; session?: Session | null } = {}
) {
  const { db, dispose } = await createTestDb();
  const ctx = createTRPCContext({
    db,
    log: options.log ?? silentLogger,
    requestId: "test-request",
    session: options.session,
  });
  return { ctx, db, dispose };
}
