import type { Database } from "@workspace/db";
import { rootCause } from "@workspace/kernel/errors";
import { Hono } from "hono";

import type { Logger } from "../lib/logger.js";

/**
 * Liveness `/healthz`; readiness `/readyz` — not ready while draining for
 * shutdown or when `db.ping()` fails.
 */
export function createProbeRoutes(
  db: Database,
  log: Logger,
  isDraining: () => boolean
) {
  const probes = new Hono();

  probes.get("/healthz", (c) => c.json({ status: "ok", t: Date.now() }));

  probes.get("/readyz", async (c) => {
    if (isDraining()) {
      return c.json({ status: "draining", t: Date.now() }, 503);
    }
    try {
      await db.ping();
      return c.json({ status: "ready", t: Date.now() });
    } catch (error) {
      // Probes skip the access log, so this is the only trace of the cause.
      log.warn({ err: rootCause(error) }, "readiness check failed");
      return c.json({ status: "not_ready", t: Date.now() }, 503);
    }
  });

  return probes;
}
