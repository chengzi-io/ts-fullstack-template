import { initTRPC } from "@trpc/server";
import superjson from "superjson";

import type { Context } from "./context.js";

/**
 * tRPC init for this monorepo. Routers import `router` / `publicProcedure` from here.
 * Auth-ready extension: add `protectedProcedure` with a middleware when you have sessions.
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

const { router, procedure: publicProcedure } = t;

export { publicProcedure, router };
