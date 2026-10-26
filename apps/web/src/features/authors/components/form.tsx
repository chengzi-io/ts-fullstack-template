import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@workspace/ui/components/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { useCallback } from "react";
import { useForm } from "react-hook-form";

import {
  type AuthorFormValues,
  authorFormDefaults,
  authorFormSchema,
} from "../model/form.ts";

interface AuthorFormProps {
  defaultValues?: AuthorFormValues;
  isSubmitting?: boolean;
  onSubmit: (values: AuthorFormValues) => void | Promise<void>;
  submitLabel?: string;
}

/** Minimal author create/edit form for the demo FK path. */
export function AuthorForm({
  defaultValues = authorFormDefaults,
  isSubmitting = false,
  onSubmit,
  submitLabel = "Create author",
}: AuthorFormProps) {
  const form = useForm<AuthorFormValues>({
    defaultValues,
    resolver: zodResolver(authorFormSchema),
  });

  const busy = isSubmitting || form.formState.isSubmitting;
  const {
    formState: { errors },
    register,
    reset,
  } = form;

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      reset(authorFormDefaults);
    } catch {
      // Keep values; parent surfaces failure.
    }
  });

  const handleReset = useCallback(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="author-name">Name</FieldLabel>
          <Input
            aria-invalid={!!errors.name}
            disabled={busy}
            id="author-name"
            placeholder="e.g. Ada"
            {...register("name")}
          />
          <FieldError errors={[errors.name]} />
        </Field>
      </FieldGroup>

      <div className="flex flex-wrap gap-2">
        <Button aria-busy={busy} disabled={busy} type="submit">
          {submitLabel}
        </Button>
        <Button
          disabled={busy}
          onClick={handleReset}
          type="button"
          variant="outline"
        >
          Reset
        </Button>
      </div>
    </form>
  );
}
