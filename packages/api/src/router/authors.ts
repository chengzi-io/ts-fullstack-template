import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import {
  authorIdInput,
  authorSchema,
  createAuthorInput,
  listAuthorsInput,
  listAuthorsOutput,
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

  list: publicProcedure
    .input(listAuthorsInput)
    .output(listAuthorsOutput)
    .query(({ ctx, input }) => ctx.repos.authors.list(input)),
} satisfies TRPCRouterRecord;

function notFound(): TRPCError {
  return new TRPCError({ code: "NOT_FOUND", message: "Author not found" });
}
