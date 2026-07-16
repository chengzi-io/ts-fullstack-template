import type { Database } from "@workspace/db";
import { sql } from "drizzle-orm";
import { Hono } from "hono";

/**
 * Kubernetes-style probes
 * - GET /healthz  — process up
 * - GET /readyz — dependencies OK (DB)
 */
export function createProbeRoutes(db: Database) {
  const probes = new Hono();

  probes.get("/healthz", (c) => c.json({ status: "ok", t: Date.now() }));

  probes.get("/readyz", async (c) => {
    try {
      await db.run(sql`SELECT 1`);
      return c.json({ status: "ready", t: Date.now() });
    } catch {
      return c.json({ status: "not_ready", t: Date.now() }, 503);
    }
  });

  return probes;
}
