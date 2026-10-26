import { initTRPC, type TRPC_ERROR_CODE_KEY, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";
import type { Context } from "./context.js";
import {
  ConflictError,
  InvalidReferenceError,
  NotFoundError,
  rootCause,
} from "./errors.js";

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
  // tRPC otherwise adds `stack` whenever NODE_ENV !== "production"; Drizzle
  // stacks embed the failed SQL and its params. Causes go to the log instead.
  isDev: false,
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
  } else if (result.error.code === "INTERNAL_SERVER_ERROR") {
    ctx.log.error(
      {
        ...base,
        code: result.error.code,
        err: rootCause(result.error),
        status: "error",
      },
      "procedure failed"
    );
  } else {
    ctx.log.warn(
      { ...base, code: result.error.code, status: "error" },
      "procedure failed"
    );
  }

  return result;
});

/** Expected repo failures → client-facing codes, in one place. */
function domainErrorCode(error: unknown): TRPC_ERROR_CODE_KEY | null {
  if (error instanceof NotFoundError) {
    return "NOT_FOUND";
  }
  if (error instanceof ConflictError) {
    return "CONFLICT";
  }
  if (error instanceof InvalidReferenceError) {
    return "BAD_REQUEST";
  }
  return null;
}

const domainErrors = t.middleware(async ({ next }) => {
  const result = await next();
  if (!result.ok) {
    const { cause } = result.error;
    const code = domainErrorCode(cause);
    if (code && cause instanceof Error) {
      throw new TRPCError({ cause, code, message: cause.message });
    }
  }
  return result;
});

const { createCallerFactory, router } = t;

export const createTRPCRouter = router;

/** In-process / tests — prefer over HTTP. */
export { createCallerFactory };

// The logger wraps domainErrors, so it records the mapped code.
export const publicProcedure = t.procedure
  .use(procedureLogger)
  .use(domainErrors);

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
