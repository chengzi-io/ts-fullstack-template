import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import { authorsRouter } from "./router/authors.js";
import { postsRouter } from "./router/posts.js";
import { createCallerFactory, createTRPCRouter } from "./trpc.js";

export const appRouter = createTRPCRouter({
  authors: authorsRouter,
  posts: postsRouter,
});

export type AppRouter = typeof appRouter;
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export const createCaller = createCallerFactory(appRouter);
