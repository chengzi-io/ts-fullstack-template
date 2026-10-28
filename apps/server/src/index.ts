import type { Server } from "node:http";
import { serve } from "@hono/node-server";
import { appRouter } from "@workspace/api";
import { createDb } from "@workspace/db";

import { createApp } from "./app.js";
import { env } from "./env.js";
import { createLogger } from "./lib/logger.js";
import { createShutdown } from "./lib/shutdown.js";
import { startTracing } from "./lib/tracing.js";

const log = createLogger({
  level: env.LOG_LEVEL,
  nodeEnv: env.NODE_ENV,
});

// Before `createApp`: `@hono/otel` resolves its tracer when the app is built.
const tracing = await startTracing({
  endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
});

const db = createDb({
  authToken: env.DATABASE_AUTH_TOKEN,
  url: env.DATABASE_URL,
});
let draining = false;

const app = createApp({
  corsOrigin: env.CORS_ORIGIN,
  db,
  isDraining: () => draining,
  log,
  router: appRouter,
});

const server = serve(
  {
    fetch: app.fetch,
    port: env.PORT,
    serverOptions: {
      headersTimeout: env.HTTP_HEADERS_TIMEOUT_MS,
      keepAliveTimeout: env.HTTP_KEEP_ALIVE_TIMEOUT_MS,
      requestTimeout: env.HTTP_REQUEST_TIMEOUT_MS,
    },
  },
  (info) => {
    log.info({ nodeEnv: env.NODE_ENV, port: info.port }, "server listening");
  }
) as Server;

const shutdown = createShutdown({
  closeDatabase: () => db.close(),
  closeTracing: () => tracing.shutdown(),
  drainMs: env.SHUTDOWN_DRAIN_MS,
  exit: (code) => process.exit(code),
  log,
  onDrainStart: () => {
    draining = true;
  },
  server,
  timeoutMs: env.SHUTDOWN_TIMEOUT_MS,
});

const startShutdown = (request: Parameters<typeof shutdown>[0]): void => {
  shutdown(request).catch((error: unknown) => {
    log.error({ err: error }, "shutdown coordinator failed");
    process.exitCode = 1;
  });
};

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => startShutdown({ reason: signal }));
}

for (const event of ["unhandledRejection", "uncaughtException"] as const) {
  process.on(event, (error: unknown) => {
    log.error({ err: error, reason: event }, "fatal process error");
    startShutdown({ exitCode: 1, reason: event });
  });
}
