import type { TRPCRouterRecord } from "@trpc/server";
import { publicProcedure } from "@workspace/kernel/trpc";

import {
  createPostInput,
  deletePostOutput,
  listPostsInput,
  listPostsOutput,
  postIdInput,
  postSchema,
  updatePostInput,
} from "./contract.js";
import { createPostsRepo } from "./repo.js";

/** Every posts procedure gets its repo on `ctx.posts`. */
const postsProcedure = publicProcedure.use(({ ctx, next }) =>
  next({ ctx: { posts: createPostsRepo(ctx.db) } })
);

/** Demo — delete with authors. Repo errors map to tRPC codes in the kernel. */
export const postsRouter = {
  byId: postsProcedure
    .input(postIdInput)
    .output(postSchema)
    .query(({ ctx, input }) => ctx.posts.byId(input.id)),

  create: postsProcedure
    .input(createPostInput)
    .output(postSchema)
    .mutation(({ ctx, input }) => ctx.posts.create(input)),

  delete: postsProcedure
    .input(postIdInput)
    .output(deletePostOutput)
    .mutation(async ({ ctx, input }) => {
      await ctx.posts.delete(input.id);
      return { ok: true } as const;
    }),

  list: postsProcedure
    .input(listPostsInput)
    .output(listPostsOutput)
    .query(({ ctx, input }) => ctx.posts.list(input)),

  update: postsProcedure
    .input(updatePostInput)
    .output(postSchema)
    .mutation(({ ctx, input: { id, ...patch } }) =>
      ctx.posts.update(id, patch)
    ),
} satisfies TRPCRouterRecord;
