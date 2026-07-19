import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";

import type { Context } from "./context.js";

const t = initTRPC.context<Context>().create({
  errorFormatter({ ctx, error, shape }) {
    const zodError =
      error.code === "BAD_REQUEST" && error.cause instanceof z.ZodError
        ? z.flattenError(error.cause)
        : null;

    return {
      ...shape,
      data: {
        ...shape.data,
        requestId: ctx?.requestId ?? null,
        zodError,
      },
      message:
        error.code === "INTERNAL_SERVER_ERROR"
          ? "Internal server error"
          : shape.message,
    };
  },
  transformer: superjson,
});

const procedureLogger = t.middleware(async ({ ctx, next, path, type }) => {
  const startedAt = Date.now();
  const result = await next();
  const base = {
    durationMs: Date.now() - startedAt,
    path,
    requestId: ctx.requestId,
    type,
  };

  if (result.ok) {
    ctx.log.info({ ...base, status: "ok" }, "procedure");
  } else {
    const level =
      result.error.code === "INTERNAL_SERVER_ERROR" ? "error" : "warn";
    ctx.log[level](
      { ...base, code: result.error.code, status: "error" },
      "procedure failed"
    );
  }

  return result;
});

const { createCallerFactory, router } = t;

export const createTRPCRouter = router;

/** In-process / tests — prefer over HTTP. */
export { createCallerFactory };

export const publicProcedure = t.procedure.use(procedureLogger);

/** Requires `ctx.session.user` (host must populate session). */
export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});
