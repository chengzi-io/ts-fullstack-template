import type { RouterInputs } from "@workspace/api";
import { createPostInput } from "@workspace/posts/contract";
import { z } from "zod";

type CreatePostInput = RouterInputs["posts"]["create"];
type UpdatePostInput = RouterInputs["posts"]["update"];

/**
 * UI form schema from domain create input.
 * Body: UI `""` → wire `null`. authorId: UI `0` means "nothing picked yet", so
 * the message is a picker prompt instead of the domain's id validation.
 */
export const postFormSchema = createPostInput
  .pick({ authorId: true, title: true })
  .extend({
    authorId: z.number().int().min(1, "Choose an author"),
    body: z.string().optional(),
  });

export type PostFormValues = z.output<typeof postFormSchema>;

export const postFormDefaults: PostFormValues = {
  authorId: 0,
  body: "",
  title: "",
};

export function toCreatePostInput(values: PostFormValues): CreatePostInput {
  const body = values.body?.trim();
  return {
    authorId: values.authorId,
    body: body || null,
    title: values.title,
  };
}

export function toUpdatePostInput(
  id: number,
  values: PostFormValues
): UpdatePostInput {
  return {
    id,
    ...toCreatePostInput(values),
  };
}
