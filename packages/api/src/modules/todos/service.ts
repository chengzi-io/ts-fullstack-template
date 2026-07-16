import type { Database } from "@workspace/db";
import {
  type NewTodo,
  type Todo,
  todosTable,
} from "@workspace/db/schema/todos";
import { and, desc, eq } from "drizzle-orm";

import type { PaginatedResult } from "../../shared/pagination.js";
import type {
  CreateTodoInput,
  ListTodosInput,
  UpdateTodoInput,
} from "./schema.js";

/**
 * Template demo service. Pass `db` from tRPC context — no process-wide singleton here.
 * Replace with your domain services when dropping the todos example.
 */
export async function listTodos(
  db: Database,
  options: ListTodosInput
): Promise<PaginatedResult<Todo>> {
  const { completed, priority, page, pageSize } = options;

  const where = and(
    completed === undefined ? undefined : eq(todosTable.completed, completed),
    priority === undefined ? undefined : eq(todosTable.priority, priority)
  );

  const [items, total] = await Promise.all([
    db
      .select()
      .from(todosTable)
      .where(where)
      .orderBy(desc(todosTable.createdAt), desc(todosTable.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.$count(todosTable, where),
  ]);

  return {
    items,
    page,
    pageCount: Math.ceil(total / pageSize),
    pageSize,
    total,
  };
}

export async function getTodoById(
  db: Database,
  id: number
): Promise<Todo | undefined> {
  const [todo] = await db
    .select()
    .from(todosTable)
    .where(eq(todosTable.id, id))
    .limit(1);

  return todo;
}

export async function createTodo(
  db: Database,
  input: CreateTodoInput
): Promise<Todo> {
  const values: NewTodo = {
    completed: input.completed ?? false,
    description: input.description ?? null,
    dueAt: input.dueAt ?? null,
    priority: input.priority ?? 1,
    title: input.title,
  };

  const [todo] = await db.insert(todosTable).values(values).returning();

  if (!todo) {
    throw new Error("Failed to create todo");
  }

  return todo;
}

export async function updateTodo(
  db: Database,
  id: number,
  input: UpdateTodoInput
): Promise<Todo | undefined> {
  const patch: Partial<NewTodo> = {};

  if (input.title !== undefined) {
    patch.title = input.title;
  }
  if (input.description !== undefined) {
    patch.description = input.description;
  }
  if (input.completed !== undefined) {
    patch.completed = input.completed;
  }
  if (input.priority !== undefined) {
    patch.priority = input.priority;
  }
  if (input.dueAt !== undefined) {
    patch.dueAt = input.dueAt;
  }

  if (Object.keys(patch).length === 0) {
    return getTodoById(db, id);
  }

  const [todo] = await db
    .update(todosTable)
    .set(patch)
    .where(eq(todosTable.id, id))
    .returning();

  return todo;
}

export async function deleteTodo(db: Database, id: number): Promise<boolean> {
  const deleted = await db
    .delete(todosTable)
    .where(eq(todosTable.id, id))
    .returning({ id: todosTable.id });

  return deleted.length > 0;
}
