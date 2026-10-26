import { zodResolver } from "@hookform/resolvers/zod";
import type { AuthorSummary } from "@workspace/authors/contract";
import { Button } from "@workspace/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import { type ChangeEvent, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";

import {
  type PostFormValues,
  postFormDefaults,
  postFormSchema,
} from "../model/form.ts";

const controlClassName =
  "w-full rounded-2xl border border-transparent bg-input/50 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-invalid:border-destructive";

interface PostFormProps {
  authorSearch: string;
  /** Picker options: search matches (plus the post's own author when editing). */
  authors: AuthorSummary[];
  defaultValues?: PostFormValues;
  isSubmitting?: boolean;
  onAuthorSearchChange: (search: string) => void;
  onCancel?: () => void;
  onSubmit: (values: PostFormValues) => void | Promise<void>;
  submitLabel?: string;
}

export function PostForm({
  authors,
  authorSearch,
  defaultValues = postFormDefaults,
  isSubmitting = false,
  onAuthorSearchChange,
  onCancel,
  onSubmit,
  submitLabel = "Create post",
}: PostFormProps) {
  const form = useForm<PostFormValues>({
    defaultValues: {
      ...defaultValues,
      authorId:
        defaultValues.authorId > 0
          ? defaultValues.authorId
          : (authors[0]?.id ?? 0),
    },
    resolver: zodResolver(postFormSchema),
  });

  const busy = isSubmitting || form.formState.isSubmitting;
  const {
    formState: { errors },
    register,
    reset,
    setValue,
  } = form;

  // A native <select> shows its first option when the value is not among the
  // options, while the form would still submit the old id. Keep them in sync.
  useEffect(() => {
    const [first] = authors;
    const selected = form.getValues("authorId");
    if (first && !authors.some((author) => author.id === selected)) {
      setValue("authorId", first.id);
    }
  }, [authors, form, setValue]);

  const handleAuthorSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onAuthorSearchChange(event.target.value);
    },
    [onAuthorSearchChange]
  );

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      reset({
        ...postFormDefaults,
        authorId: authors[0]?.id ?? 0,
      });
    } catch {
      // Keep values; parent surfaces failure.
    }
  });

  const handleReset = useCallback(() => {
    reset({
      ...defaultValues,
      authorId:
        defaultValues.authorId > 0
          ? defaultValues.authorId
          : (authors[0]?.id ?? 0),
    });
  }, [authors, defaultValues, reset]);

  const noAuthors = authors.length === 0;

  return (
    <form className="flex flex-col gap-6" noValidate onSubmit={handleSubmit}>
      <FieldGroup>
        <Field data-invalid={!!errors.authorId}>
          <FieldLabel htmlFor="post-author">Author</FieldLabel>
          <Input
            aria-label="Search authors"
            disabled={busy}
            onChange={handleAuthorSearchChange}
            placeholder="Search authors…"
            type="search"
            value={authorSearch}
          />
          <select
            aria-invalid={!!errors.authorId}
            className={cn(controlClassName, "h-8 px-2.5")}
            disabled={busy || noAuthors}
            id="post-author"
            {...register("authorId", { valueAsNumber: true })}
          >
            {noAuthors ? (
              <option value={0}>No matching authors</option>
            ) : (
              authors.map((author) => (
                <option key={author.id} value={author.id}>
                  {author.name}
                </option>
              ))
            )}
          </select>
          <FieldDescription>
            Lists the first matches; search to find others. Real apps usually
            take the author from the session.
          </FieldDescription>
          <FieldError errors={[errors.authorId]} />
        </Field>

        <Field data-invalid={!!errors.title}>
          <FieldLabel htmlFor="post-title">Title</FieldLabel>
          <Input
            aria-invalid={!!errors.title}
            disabled={busy}
            id="post-title"
            placeholder="e.g. Hello from the template"
            {...register("title")}
          />
          <FieldError errors={[errors.title]} />
        </Field>

        <Field data-invalid={!!errors.body}>
          <FieldLabel htmlFor="post-body">Body</FieldLabel>
          <textarea
            aria-invalid={!!errors.body}
            className={cn(controlClassName, "px-2.5 py-2")}
            disabled={busy}
            id="post-body"
            placeholder="Optional"
            rows={4}
            {...register("body")}
          />
          <FieldDescription>Optional. Max 5000 characters.</FieldDescription>
          <FieldError errors={[errors.body]} />
        </Field>
      </FieldGroup>

      <div className="flex flex-wrap gap-2">
        <Button aria-busy={busy} disabled={busy || noAuthors} type="submit">
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
        {onCancel ? (
          <Button
            disabled={busy}
            onClick={onCancel}
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
