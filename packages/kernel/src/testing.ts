import { createTestDb } from "@workspace/db/testing";

import { createTRPCContext, type Logger } from "./context.js";

export const silentLogger: Logger = {
  debug: () => undefined,
  error: () => undefined,
  info: () => undefined,
  warn: () => undefined,
};

/**
 * Real context on a fresh temp SQLite (every module's schema). Pair with
 * `createCallerFactory(router)(ctx)`; call `dispose` after the test.
 */
export async function createTestContext(options: { log?: Logger } = {}) {
  const { db, dispose } = await createTestDb();
  const ctx = createTRPCContext({
    db,
    log: options.log ?? silentLogger,
    requestId: "test-request",
  });
  return { ctx, db, dispose };
}
