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

/** Real app on a fresh temp SQLite, no listening port; logs land in `logs`. */
export async function createTestApp() {
  const { db, dispose } = await createTestDb();
  const logs: Record<string, unknown>[] = [];
  const log = pino(
    { level: "info" },
    { write: (line: string) => logs.push(JSON.parse(line)) }
  );
  const app = createApp({ db, log, router: testRouter });
  return { app, db, dispose, logs };
}
