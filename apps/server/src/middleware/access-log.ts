import { createMiddleware } from "hono/factory";

import type { Logger } from "../lib/logger.js";

export interface AccessLogVariables {
  log: Logger;
}

/**
 * Structured access log after the handler (method/path/status/durationMs).
 * Requires `log` on context (set after requestId → child logger).
 */
export const accessLog = createMiddleware<{
  Variables: AccessLogVariables;
}>(async (c, next) => {
  const start = Date.now();
  await next();

  const { method, path } = c.req;
  // Probes should not flood info-level access logs.
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
