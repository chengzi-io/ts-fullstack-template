import { serve } from "@hono/node-server";

import { createApp } from "./app.js";
import { db } from "./db.js";
import { env } from "./env.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger({
  level: env.LOG_LEVEL,
  nodeEnv: env.NODE_ENV,
});

const app = createApp({
  corsOrigin: env.CORS_ORIGIN,
  db,
  log,
});

const server = serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    log.info({ nodeEnv: env.NODE_ENV, port: info.port }, "server listening");
  }
);

const SHUTDOWN_TIMEOUT_MS = 10_000;

function shutdown(signal: string): void {
  log.info({ signal }, "shutting down");

  const forceTimer = setTimeout(() => {
    log.error(
      { timeoutMs: SHUTDOWN_TIMEOUT_MS },
      "forced exit after close timeout"
    );
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceTimer.unref();

  server.close((err) => {
    clearTimeout(forceTimer);
    if (err) {
      log.error({ err }, "error during server close");
      process.exit(1);
    }
    log.info("server closed");
    process.exit(0);
  });
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    shutdown(signal);
  });
}
