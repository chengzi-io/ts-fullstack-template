import { authorsTable } from "@workspace/authors/schema";
import { index, int, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Demo — delete with authors. FK restrict: author with posts cannot be deleted. */
export const postsTable = sqliteTable(
  "posts",
  {
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
  },
  (table) => [
    // SQLite does not index foreign keys itself; filtering by author and the
    // restrict check on author delete would otherwise scan every post.
    index("posts_author_id_idx").on(table.authorId),
  ]
);
