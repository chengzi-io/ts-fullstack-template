import type { TRPCRouterRecord } from "@trpc/server";
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

/** Demo — delete with posts. Repo errors map to tRPC codes in `trpc.ts`. */
export const authorsRouter = {
  byId: publicProcedure
    .input(authorIdInput)
    .output(authorSchema)
    .query(({ ctx, input }) => ctx.repos.authors.byId(input.id)),

  create: publicProcedure
    .input(createAuthorInput)
    .output(authorSchema)
    .mutation(({ ctx, input }) => ctx.repos.authors.create(input)),

  delete: publicProcedure
    .input(authorIdInput)
    .output(deleteAuthorOutput)
    .mutation(async ({ ctx, input }) => {
      await ctx.repos.authors.delete(input.id);
      return { ok: true } as const;
    }),

  list: publicProcedure
    .input(listAuthorsInput)
    .output(listAuthorsOutput)
    .query(({ ctx, input }) => ctx.repos.authors.list(input)),

  update: publicProcedure
    .input(updateAuthorInput)
    .output(authorSchema)
    .mutation(({ ctx, input: { id, ...patch } }) =>
      ctx.repos.authors.update(id, patch)
    ),
} satisfies TRPCRouterRecord;
