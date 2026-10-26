/** Demo — delete with posts. Browser-safe: Zod shapes and their types only. */
import {
  paginatedOutput,
  paginationInput,
  searchQuery,
} from "@workspace/kernel/pagination";
import { z } from "zod";

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

export const updateAuthorInput = createAuthorInput
  .partial()
  .extend({
    id: authorIdSchema,
  })
  .refine(
    (data) =>
      Object.entries(data).some(
        ([key, value]) => key !== "id" && value !== undefined
      ),
    { message: "No fields to update" }
  );

export const listAuthorsInput = paginationInput
  .extend({
    /** Matches the name. */
    q: searchQuery,
  })
  .prefault({});

export const authorIdInput = z.object({
  id: authorIdSchema,
});

export const listAuthorsOutput = paginatedOutput(authorSchema);

export const deleteAuthorOutput = z.object({
  ok: z.literal(true),
});

export type Author = z.output<typeof authorSchema>;
export type AuthorSummary = z.output<typeof authorSummarySchema>;
export type CreateAuthorInput = z.output<typeof createAuthorInput>;
export type UpdateAuthorInput = z.output<typeof updateAuthorInput>;
export type UpdateAuthorPatch = Omit<UpdateAuthorInput, "id">;
export type ListAuthorsInput = z.output<typeof listAuthorsInput>;
export type ListAuthorsResult = z.output<typeof listAuthorsOutput>;
