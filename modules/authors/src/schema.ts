import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Demo — delete with posts. */
export const authorsTable = sqliteTable("authors", {
  id: int().primaryKey({ autoIncrement: true }),

  name: text().notNull(),

  createdAt: int({ mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});
