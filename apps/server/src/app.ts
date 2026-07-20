import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "@workspace/api";
import { createTRPCContext } from "@workspace/api/context";
import type { Database } from "@workspace/db";
import type { AppRepos } from "@workspace/domain";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import type { RequestIdVariables } from "hono/request-id";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";

import type { Logger } from "./lib/logger.js";
import { accessLog } from "./middleware/access-log.js";
import { createProbeRoutes } from "./routes/probes.js";

const BODY_LIMIT_BYTES = 1024 * 1024;

export type AppVariables = RequestIdVariables & {
  log: Logger;
};

export interface CreateAppOptions {
  corsOrigin?: string;
  db: Database;
  log: Logger;
  repos: AppRepos;
}

export function createApp(options: CreateAppOptions) {
  const { corsOrigin, db, log, repos } = options;
  const app = new Hono<{ Variables: AppVariables }>();

  app.use(requestId());
  app.use(async (c, next) => {
    const id = c.get("requestId");
    c.set("log", log.child({ requestId: id }));
    await next();
    c.header("X-Request-Id", id);
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
      // Adapter types createContext as Record; cast until @hono/trpc-server aligns.
      createContext: (_opts, c) =>
        createTRPCContext({
          log: c.get("log"),
          repos,
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

    if (err instanceof HTTPException) {
      const isServerError = err.status >= 500;
      child[isServerError ? "error" : "warn"](
        { errorName: err.name, requestId: id, status: err.status },
        "http error"
      );

      return c.json(
        {
          error: isServerError ? "INTERNAL" : "HTTP_ERROR",
          requestId: id,
          ...(isServerError
            ? {}
            : { message: err.message || "Request failed" }),
        },
        err.status
      );
    }

    child.error({ err, requestId: id }, "unhandled error");
    return c.json({ error: "INTERNAL", requestId: id }, 500);
  });

  return app;
}

export type App = ReturnType<typeof createApp>;
