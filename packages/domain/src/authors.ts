/** Demo — delete with posts. */
import { z } from "zod";

import { paginatedOutput, paginationInput } from "./pagination.js";

export const authorIdSchema = z.number().int().positive("Invalid author id");

export const authorSchema = z.object({
  createdAt: z.date(),
  id: authorIdSchema,
  name: z.string(),
});

export const authorSummarySchema = authorSchema.pick({
  id: true,
  name: true,
});

export const createAuthorInput = authorSchema.pick({ name: true }).extend({
  name: z.string().trim().min(1, "name is required").max(100),
});

export const listAuthorsInput = paginationInput.prefault({});

export const authorIdInput = z.object({
  id: authorIdSchema,
});

export const listAuthorsOutput = paginatedOutput(authorSchema);

export type Author = z.output<typeof authorSchema>;
export type AuthorSummary = z.output<typeof authorSummarySchema>;
export type CreateAuthorInput = z.output<typeof createAuthorInput>;
export type ListAuthorsInput = z.output<typeof listAuthorsInput>;
export type ListAuthorsResult = z.output<typeof listAuthorsOutput>;

export interface AuthorsRepo {
  byId: (id: number) => Promise<Author | null>;
  create: (input: CreateAuthorInput) => Promise<Author>;
  list: (query: ListAuthorsInput) => Promise<ListAuthorsResult>;
}
