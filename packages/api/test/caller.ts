import { createRepos } from "@workspace/db/repos";
import { createTestDb } from "@workspace/db/testing";

import { createTRPCContext, type Logger } from "../src/context.js";
import { createCaller } from "../src/index.js";

const silentLogger: Logger = {
  debug: () => undefined,
  error: () => undefined,
  info: () => undefined,
  warn: () => undefined,
};

export type TestCaller = ReturnType<typeof createCaller>;

/** Real routers + real repos on a fresh temp SQLite; call `dispose` after. */
export async function createTestCaller() {
  const { db, dispose } = await createTestDb();
  const caller = createCaller(
    createTRPCContext({
      log: silentLogger,
      repos: createRepos(db),
      requestId: "test-request",
    })
  );
  return { caller, dispose };
}
