import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const todosTable = sqliteTable("todos", {
  completed: int({ mode: "boolean" }).notNull().default(false),

  createdAt: int({ mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  description: text(),
  dueAt: int({ mode: "timestamp_ms" }),
  id: int().primaryKey({ autoIncrement: true }),
  /** 0 = low, 1 = medium, 2 = high */
  priority: int().notNull().default(1),

  title: text().notNull(),
  updatedAt: int({ mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
});

export type Todo = typeof todosTable.$inferSelect;
export type NewTodo = typeof todosTable.$inferInsert;
