import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
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

/** Demo — delete with authors. */
export const postsRouter = {
  byId: publicProcedure
    .input(postIdInput)
    .output(postSchema)
    .query(async ({ ctx, input }) => {
      const post = await ctx.repos.posts.byId(input.id);
      if (!post) {
        throw notFound();
      }
      return post;
    }),

  create: publicProcedure
    .input(createPostInput)
    .output(postSchema)
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.repos.posts.create(input);
      if (!post) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Author not found",
        });
      }
      return post;
    }),

  delete: publicProcedure
    .input(postIdInput)
    .output(deletePostOutput)
    .mutation(async ({ ctx, input }) => {
      const deleted = await ctx.repos.posts.delete(input.id);
      if (!deleted) {
        throw notFound();
      }
      return { ok: true } as const;
    }),

  list: publicProcedure
    .input(listPostsInput)
    .output(listPostsOutput)
    .query(({ ctx, input }) => ctx.repos.posts.list(input)),

  update: publicProcedure
    .input(updatePostInput)
    .output(postSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input;
      const existing = await ctx.repos.posts.byId(id);
      if (!existing) {
        throw notFound();
      }
      const post = await ctx.repos.posts.update(id, patch);
      if (!post) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Author not found",
        });
      }
      return post;
    }),
} satisfies TRPCRouterRecord;

function notFound(): TRPCError {
  return new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
}
