import { createTestDb } from "@workspace/db/testing";
import { createTRPCRouter, publicProcedure } from "@workspace/kernel/trpc";
import { z } from "zod";

import { createApp } from "../src/app.js";
import { createLogger } from "../src/lib/logger.js";

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

/** Real app on a fresh temp SQLite, silent logger, no listening port. */
export async function createTestApp() {
  const { db, dispose } = await createTestDb();
  const app = createApp({
    db,
    log: createLogger({ level: "silent", nodeEnv: "test" }),
    router: testRouter,
  });
  return { app, db, dispose };
}
