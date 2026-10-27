import { zodResolver } from "@hookform/resolvers/zod";
import type { AuthorSummary } from "@workspace/authors/contract";
import { Button } from "@workspace/ui/components/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@workspace/ui/components/combobox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import {
  type PostFormValues,
  postFormDefaults,
  postFormSchema,
} from "../model/form.ts";

const controlClassName =
  "w-full rounded-2xl border border-transparent bg-input/50 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-invalid:border-destructive";

interface AuthorComboboxProps {
  authors: AuthorSummary[];
  disabled: boolean;
  invalid: boolean;
  onSearchChange: (search: string) => void;
  onSelectId: (authorId: number) => void;
  value: number;
}

const authorLabel = (author: AuthorSummary) => author.name;
const isSameAuthor = (item: AuthorSummary, value: AuthorSummary) =>
  item.id === value.id;

function AuthorCombobox({
  authors,
  disabled,
  invalid,
  onSearchChange,
  onSelectId,
  value,
}: AuthorComboboxProps) {
  const [picked, setPicked] = useState<AuthorSummary | null>(
    () => authors.find((author) => author.id === value) ?? null
  );
  // Matches change under the user's typing; only a pick (or the form changing
  // the id) may change the selection, so keep the picked author object.
  const selected =
    picked?.id === value
      ? picked
      : (authors.find((author) => author.id === value) ?? null);

  const handleInputValueChange = useCallback(
    (next: string, details: { reason: string }) => {
      // Picking an item fills the input with its name; that is not the user
      // typing, so it must not search the server.
      if (details.reason !== "item-press" && details.reason !== "none") {
        onSearchChange(next);
      }
    },
    [onSearchChange]
  );

  const handleValueChange = useCallback(
    (author: AuthorSummary | null) => {
      setPicked(author);
      onSelectId(author?.id ?? 0);
    },
    [onSelectId]
  );

  return (
    <Combobox
      filter={null}
      isItemEqualToValue={isSameAuthor}
      items={authors}
      itemToStringLabel={authorLabel}
      onInputValueChange={handleInputValueChange}
      onValueChange={handleValueChange}
      value={selected}
    >
      <ComboboxInput
        aria-invalid={invalid}
        disabled={disabled}
        id="post-author"
        placeholder="Search authors…"
      />
      <ComboboxContent>
        <ComboboxList>
          {(author: AuthorSummary) => (
            <ComboboxItem key={author.id} value={author}>
              {author.name}
            </ComboboxItem>
          )}
        </ComboboxList>
        <ComboboxEmpty>No matching authors</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}

interface PostFormProps {
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
  defaultValues = postFormDefaults,
  isSubmitting = false,
  onAuthorSearchChange,
  onCancel,
  onSubmit,
  submitLabel = "Create post",
}: PostFormProps) {
  const form = useForm<PostFormValues>({
    defaultValues,
    resolver: zodResolver(postFormSchema),
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
      reset(postFormDefaults);
    } catch {
      // Keep values; parent surfaces failure.
    }
  });

  const handleReset = useCallback(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const authorInvalid = !!errors.authorId;
  const renderAuthor = useCallback(
    ({
      field,
    }: {
      field: { onChange: (id: number) => void; value: number };
    }) => (
      <AuthorCombobox
        authors={authors}
        disabled={busy}
        invalid={authorInvalid}
        onSearchChange={onAuthorSearchChange}
        onSelectId={field.onChange}
        value={field.value}
      />
    ),
    [authors, authorInvalid, busy, onAuthorSearchChange]
  );

  return (
    <form className="flex flex-col gap-6" noValidate onSubmit={handleSubmit}>
      <FieldGroup>
        <Field data-invalid={!!errors.authorId}>
          <FieldLabel htmlFor="post-author">Author</FieldLabel>
          <Controller
            control={form.control}
            name="authorId"
            render={renderAuthor}
          />
          <FieldDescription>
            Type to search all authors. Real apps usually take the author from
            the session.
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
