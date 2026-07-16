import { z } from "zod";

import { paginationSchema } from "../../shared/pagination.js";

/** 0 = low, 1 = medium, 2 = high — template demo field; replace with your domain. */
export const todoPrioritySchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
]);

/** JSON / superjson date: Date, ISO string, epoch ms, or null. */
const dueAtSchema = z.union([z.coerce.date(), z.null()]);
const todoIdSchema = z.number().int().positive("Invalid todo id");

export const createTodoInput = z.object({
  completed: z.boolean().optional(),
  description: z.string().nullable().optional(),
  dueAt: dueAtSchema.optional(),
  priority: todoPrioritySchema.optional(),
  title: z.string().trim().min(1, "title is required"),
});

export const listTodosInput = paginationSchema
  .extend({
    completed: z.boolean().optional(),
    priority: todoPrioritySchema.optional(),
  })
  .prefault({});

export const todoIdInput = z.object({
  id: todoIdSchema,
});

/** Mutation input: id + partial fields (at least one field besides id). */
export const updateTodoMutationInput = createTodoInput
  .partial()
  .extend({
    id: todoIdSchema,
  })
  .refine(
    (data) =>
      Object.entries(data).some(
        ([key, value]) => key !== "id" && value !== undefined
      ),
    { message: "No fields to update" }
  );

export type CreateTodoInput = z.infer<typeof createTodoInput>;
export type ListTodosInput = z.infer<typeof listTodosInput>;
export type UpdateTodoInput = Partial<CreateTodoInput>;
