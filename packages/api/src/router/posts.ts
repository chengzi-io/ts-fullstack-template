import type { TRPCRouterRecord } from "@trpc/server";
import {
  createPostInput,
  deletePostOutput,
  listPostsInput,
  listPostsOutput,
  postIdInput,
  postSchema,
  updatePostInput,
} from "@workspace/domain/posts";

import { publicProcedure } from "../trpc.js";

/** Demo — delete with authors. Repo errors map to tRPC codes in `trpc.ts`. */
export const postsRouter = {
  byId: publicProcedure
    .input(postIdInput)
    .output(postSchema)
    .query(({ ctx, input }) => ctx.repos.posts.byId(input.id)),

  create: publicProcedure
    .input(createPostInput)
    .output(postSchema)
    .mutation(({ ctx, input }) => ctx.repos.posts.create(input)),

  delete: publicProcedure
    .input(postIdInput)
    .output(deletePostOutput)
    .mutation(async ({ ctx, input }) => {
      await ctx.repos.posts.delete(input.id);
      return { ok: true } as const;
    }),

  list: publicProcedure
    .input(listPostsInput)
    .output(listPostsOutput)
    .query(({ ctx, input }) => ctx.repos.posts.list(input)),

  update: publicProcedure
    .input(updatePostInput)
    .output(postSchema)
    .mutation(({ ctx, input: { id, ...patch } }) =>
      ctx.repos.posts.update(id, patch)
    ),
} satisfies TRPCRouterRecord;
