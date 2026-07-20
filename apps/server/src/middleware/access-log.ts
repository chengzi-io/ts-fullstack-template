import { createMiddleware } from "hono/factory";

import type { Logger } from "../lib/logger.js";

export interface AccessLogVariables {
  log: Logger;
}

export const accessLog = createMiddleware<{
  Variables: AccessLogVariables;
}>(async (c, next) => {
  const start = Date.now();
  await next();

  const { method, path } = c.req;
  if (path === "/healthz" || path === "/readyz") {
    return;
  }

  c.var.log.info(
    {
      durationMs: Date.now() - start,
      method,
      path,
      status: c.res.status,
    },
    "request"
  );
});
