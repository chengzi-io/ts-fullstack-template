import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { authorsTable } from "./authors.js";

/** Demo — delete with authors. FK restrict: author with posts cannot be deleted. */
export const postsTable = sqliteTable("posts", {
  id: int().primaryKey({ autoIncrement: true }),

  authorId: int()
    .notNull()
    .references(() => authorsTable.id, { onDelete: "restrict" }),
  title: text().notNull(),
  body: text(),

  createdAt: int({ mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: int({ mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
});
