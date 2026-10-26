/** Demo — delete with authors. Output includes author. Browser-safe. */
import {
  authorIdSchema,
  authorSummarySchema,
} from "@workspace/authors/contract";
import { paginatedOutput, paginationInput } from "@workspace/kernel/pagination";
import { z } from "zod";

export const postIdSchema = z.number().int().positive("Invalid post id");

export const postSchema = z.object({
  author: authorSummarySchema,
  authorId: authorIdSchema,
  body: z.string().nullable(),
  createdAt: z.date(),
  id: postIdSchema,
  title: z.string(),
  updatedAt: z.date(),
});

export const createPostInput = postSchema
  .pick({
    authorId: true,
    body: true,
    title: true,
  })
  .extend({
    body: z.string().max(5000).nullable().optional(),
    title: z.string().trim().min(1, "title is required").max(200),
  });

export const updatePostInput = createPostInput
  .partial()
  .extend({
    id: postIdSchema,
  })
  .refine(
    (data) =>
      Object.entries(data).some(
        ([key, value]) => key !== "id" && value !== undefined
      ),
    { message: "No fields to update" }
  );

export const listPostsInput = paginationInput
  .extend({
    authorId: authorIdSchema.optional(),
  })
  .prefault({});

export const postIdInput = z.object({
  id: postIdSchema,
});

export const listPostsOutput = paginatedOutput(postSchema);

export const deletePostOutput = z.object({
  ok: z.literal(true),
});

export type Post = z.output<typeof postSchema>;
export type CreatePostInput = z.output<typeof createPostInput>;
export type UpdatePostInput = z.output<typeof updatePostInput>;
export type UpdatePostPatch = Omit<UpdatePostInput, "id">;
export type ListPostsInput = z.output<typeof listPostsInput>;
export type ListPostsResult = z.output<typeof listPostsOutput>;
