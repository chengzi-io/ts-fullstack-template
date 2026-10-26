import { createRepos } from "@workspace/db/repos";
import { createTestDb } from "@workspace/db/testing";

import { createApp } from "../src/app.js";
import { createLogger } from "../src/lib/logger.js";

/** Real app on a fresh temp SQLite, silent logger, no listening port. */
export async function createTestApp() {
  const { db, dispose } = await createTestDb();
  const app = createApp({
    db,
    log: createLogger({ level: "silent", nodeEnv: "test" }),
    repos: createRepos(db),
  });
  return { app, db, dispose };
}
