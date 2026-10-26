import { createTestDb } from "@workspace/db/testing";
import { createTRPCRouter, publicProcedure } from "@workspace/kernel/trpc";
import pino from "pino";
import { z } from "zod";

import { createApp } from "../src/app.js";

/** Host tests stay independent of business modules. */
const testRouter = createTRPCRouter({
  echo: publicProcedure
    .input(z.object({ name: z.string().trim().min(1) }))
    .mutation(({ input }) => input),
  ping: publicProcedure.query(async ({ ctx }) => {
    await ctx.db.ping();
    return { ok: true };
  }),
});

/**
 * Real app on a fresh temp SQLite, no listening port; logs land in `logs`
 * (parsed) and `lines` (raw JSON, where duplicate keys are still visible).
 * Set `readiness.draining` to simulate a shutdown in progress.
 */
export async function createTestApp() {
  const { db, dispose } = await createTestDb();
  const lines: string[] = [];
  const logs: Record<string, unknown>[] = [];
  const log = pino(
    { level: "info" },
    {
      write: (line: string) => {
        lines.push(line);
        logs.push(JSON.parse(line));
      },
    }
  );
  const readiness = { draining: false };
  const app = createApp({
    db,
    isDraining: () => readiness.draining,
    log,
    router: testRouter,
  });
  return { app, db, dispose, lines, logs, readiness };
}
