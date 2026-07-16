import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "@workspace/api";
import { createContext } from "@workspace/api/context";
import type { Database } from "@workspace/db";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import type { RequestIdVariables } from "hono/request-id";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";

import type { Logger } from "./lib/logger.js";
import { accessLog } from "./middleware/access-log.js";
import { createProbeRoutes } from "./routes/probes.js";

/** 1 MiB — enough for typical tRPC JSON; raise for uploads via a dedicated route. */
const BODY_LIMIT_BYTES = 1024 * 1024;

export type AppVariables = RequestIdVariables & {
  log: Logger;
};

export interface CreateAppOptions {
  corsOrigin?: string;
  db: Database;
  log: Logger;
}

/**
 * HTTP host: cross-cutting middleware, probes, tRPC mount.
 * Domain procedures live in `@workspace/api`.
 */
export function createApp(options: CreateAppOptions) {
  const { corsOrigin, db, log } = options;
  const app = new Hono<{ Variables: AppVariables }>();

  app.use(requestId());
  app.use(async (c, next) => {
    const id = c.get("requestId");
    c.set("log", log.child({ requestId: id }));
    await next();
  });
  app.use(accessLog);
  app.use(secureHeaders());
  app.use(
    bodyLimit({
      maxSize: BODY_LIMIT_BYTES,
      onError: (c) =>
        c.json(
          {
            error: "PAYLOAD_TOO_LARGE",
            requestId: c.get("requestId"),
          },
          413
        ),
    })
  );

  if (corsOrigin) {
    app.use(
      "/trpc/*",
      cors({
        origin: corsOrigin,
      })
    );
  }

  app.route("/", createProbeRoutes(db));

  app.use(
    "/trpc/*",
    trpcServer({
      createContext: (_opts, c) =>
        createContext({
          db,
          log: c.get("log"),
          requestId: c.get("requestId"),
        }) as unknown as Record<string, unknown>,
      router: appRouter,
    })
  );

  app.get("/", (c) => c.text("server ok"));

  app.notFound((c) =>
    c.json(
      {
        error: "NOT_FOUND",
        path: c.req.path,
        requestId: c.get("requestId"),
      },
      404
    )
  );

  app.onError((err, c) => {
    const id = c.get("requestId");
    const child = c.get("log") ?? log;
    child.error({ err, requestId: id }, "unhandled error");

    return c.json(
      {
        error: "INTERNAL",
        requestId: id,
      },
      500
    );
  });

  return app;
}

export type App = ReturnType<typeof createApp>;
