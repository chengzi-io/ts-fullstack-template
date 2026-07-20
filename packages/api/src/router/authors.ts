import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import {
  authorIdInput,
  authorSchema,
  createAuthorInput,
  deleteAuthorOutput,
  listAuthorsInput,
  listAuthorsOutput,
  updateAuthorInput,
} from "@workspace/domain/authors";

import { publicProcedure } from "../trpc.js";

/** Demo — delete with posts. */
export const authorsRouter = {
  byId: publicProcedure
    .input(authorIdInput)
    .output(authorSchema)
    .query(async ({ ctx, input }) => {
      const author = await ctx.repos.authors.byId(input.id);
      if (!author) {
        throw notFound();
      }
      return author;
    }),

  create: publicProcedure
    .input(createAuthorInput)
    .output(authorSchema)
    .mutation(({ ctx, input }) => ctx.repos.authors.create(input)),

  delete: publicProcedure
    .input(authorIdInput)
    .output(deleteAuthorOutput)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.repos.authors.delete(input.id);
      if (result === "not_found") {
        throw notFound();
      }
      if (result === "has_posts") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Author still has posts",
        });
      }
      return { ok: true } as const;
    }),

  list: publicProcedure
    .input(listAuthorsInput)
    .output(listAuthorsOutput)
    .query(({ ctx, input }) => ctx.repos.authors.list(input)),

  update: publicProcedure
    .input(updateAuthorInput)
    .output(authorSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input;
      const author = await ctx.repos.authors.update(id, patch);
      if (!author) {
        throw notFound();
      }
      return author;
    }),
} satisfies TRPCRouterRecord;

function notFound(): TRPCError {
  return new TRPCError({ code: "NOT_FOUND", message: "Author not found" });
}
