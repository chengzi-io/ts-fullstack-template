import type { TRPCRouterRecord } from "@trpc/server";
import { publicProcedure } from "@workspace/kernel/trpc";

import {
  authorIdInput,
  authorSchema,
  createAuthorInput,
  deleteAuthorOutput,
  listAuthorsInput,
  listAuthorsOutput,
  updateAuthorInput,
} from "./contract.js";
import { createAuthorsRepo } from "./repo.js";

/** Every authors procedure gets its repo on `ctx.authors`. */
const authorsProcedure = publicProcedure.use(({ ctx, next }) =>
  next({ ctx: { authors: createAuthorsRepo(ctx.db) } })
);

/** Demo — delete with posts. Repo errors map to tRPC codes in the kernel. */
export const authorsRouter = {
  byId: authorsProcedure
    .input(authorIdInput)
    .output(authorSchema)
    .query(({ ctx, input }) => ctx.authors.byId(input.id)),

  create: authorsProcedure
    .input(createAuthorInput)
    .output(authorSchema)
    .mutation(({ ctx, input }) => ctx.authors.create(input)),

  delete: authorsProcedure
    .input(authorIdInput)
    .output(deleteAuthorOutput)
    .mutation(async ({ ctx, input }) => {
      await ctx.authors.delete(input.id);
      return { ok: true } as const;
    }),

  list: authorsProcedure
    .input(listAuthorsInput)
    .output(listAuthorsOutput)
    .query(({ ctx, input }) => ctx.authors.list(input)),

  update: authorsProcedure
    .input(updateAuthorInput)
    .output(authorSchema)
    .mutation(({ ctx, input: { id, ...patch } }) =>
      ctx.authors.update(id, patch)
    ),
} satisfies TRPCRouterRecord;
