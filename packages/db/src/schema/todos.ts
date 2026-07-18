import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const todosTable = sqliteTable("todos", {
  id: int().primaryKey({ autoIncrement: true }),

  title: text().notNull(),
  description: text(),
  completed: int({ mode: "boolean" }).notNull().default(false),
  priority: text({ enum: ["L", "M", "H"] })
    .notNull()
    .default("M"),
  dueAt: int({ mode: "timestamp_ms" }),

  createdAt: int({ mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: int({ mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
});

export type Todo = typeof todosTable.$inferSelect;
export type NewTodo = typeof todosTable.$inferInsert;
