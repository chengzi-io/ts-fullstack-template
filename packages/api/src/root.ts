import { todosRouter } from "./modules/todos/router.js";
import { router } from "./trpc.js";

/**
 * App-wide tRPC router — FE↔BE contract surface.
 * Add domain routers here: `posts: postsRouter`, …
 */
export const appRouter = router({
  todos: todosRouter,
});

export type AppRouter = typeof appRouter;
