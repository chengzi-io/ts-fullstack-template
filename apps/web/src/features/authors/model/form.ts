import type { RouterInputs } from "@workspace/api";
import { createAuthorInput } from "@workspace/domain/authors";
import type { z } from "zod";

type CreateAuthorInput = RouterInputs["authors"]["create"];
type UpdateAuthorInput = RouterInputs["authors"]["update"];

export const authorFormSchema = createAuthorInput;

export type AuthorFormValues = z.output<typeof authorFormSchema>;

export const authorFormDefaults: AuthorFormValues = {
  name: "",
};

export function toCreateAuthorInput(
  values: AuthorFormValues
): CreateAuthorInput {
  return { name: values.name };
}

export function toUpdateAuthorInput(
  id: number,
  values: AuthorFormValues
): UpdateAuthorInput {
  return { id, name: values.name };
}
