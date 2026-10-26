import type { RouterInputs } from "@workspace/api";
import { createPostInput } from "@workspace/posts/contract";
import { z } from "zod";

type CreatePostInput = RouterInputs["posts"]["create"];
type UpdatePostInput = RouterInputs["posts"]["update"];

/**
 * UI form schema from domain create input.
 * Body: UI `""` → wire `null`. authorId: use valueAsNumber on the select.
 */
export const postFormSchema = createPostInput
  .pick({ authorId: true, title: true })
  .extend({
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
