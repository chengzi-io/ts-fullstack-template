import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { authorsRouter } from "@workspace/authors/router";
import { createTRPCRouter } from "@workspace/kernel/trpc";
import { postsRouter } from "@workspace/posts/router";

/** Composition only: one line per module. The web imports the types below. */
export const appRouter = createTRPCRouter({
  authors: authorsRouter,
  posts: postsRouter,
});

export type AppRouter = typeof appRouter;
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
