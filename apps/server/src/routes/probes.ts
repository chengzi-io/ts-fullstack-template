import type { Database } from "@workspace/db";
import { Hono } from "hono";

/** GET /healthz (liveness), GET /readyz (DB). */
export function createProbeRoutes(db: Database) {
  const probes = new Hono();

  probes.get("/healthz", (c) => c.json({ status: "ok", t: Date.now() }));

  probes.get("/readyz", async (c) => {
    try {
      await db.ping();
      return c.json({ status: "ready", t: Date.now() });
    } catch {
      return c.json({ status: "not_ready", t: Date.now() }, 503);
    }
  });

  return probes;
}
