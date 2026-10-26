import type { AuthorsRepo } from "@workspace/domain/authors";
import { ConflictError, NotFoundError } from "@workspace/domain/errors";
import {
  paginationOffset,
  toPaginatedResult,
} from "@workspace/domain/pagination";
import { desc, eq } from "drizzle-orm";

import { type Database, isForeignKeyViolation } from "../index.js";
import { authorsTable } from "../schema/authors.js";

const notFound = () => new NotFoundError("Author not found");

export function createAuthorsRepo(db: Database): AuthorsRepo {
  return {
    async byId(id) {
      const [author] = await db
        .select()
        .from(authorsTable)
        .where(eq(authorsTable.id, id))
        .limit(1);
      if (!author) {
        throw notFound();
      }
      return author;
    },

    async create(input) {
      const [author] = await db
        .insert(authorsTable)
        .values({ name: input.name })
        .returning();
      return author;
    },

    async delete(id) {
      // Rows that reference the author make the FK restrict the delete; the
      // database decides, so there is no check-then-delete race.
      const deleted = await db
        .delete(authorsTable)
        .where(eq(authorsTable.id, id))
        .returning({ id: authorsTable.id })
        .catch((error: unknown) => {
          throw isForeignKeyViolation(error)
            ? new ConflictError("Author is still in use", { cause: error })
            : error;
        });
      if (deleted.length === 0) {
        throw notFound();
      }
    },

    async list(query) {
      const { page, pageSize } = query;

      const [items, total] = await Promise.all([
        db
          .select()
          .from(authorsTable)
          .orderBy(desc(authorsTable.createdAt), desc(authorsTable.id))
          .limit(pageSize)
          .offset(paginationOffset(page, pageSize)),
        db.$count(authorsTable),
      ]);

      return toPaginatedResult(items, total, page, pageSize);
    },

    async update(id, patch) {
      const [author] = await db
        .update(authorsTable)
        .set(patch)
        .where(eq(authorsTable.id, id))
        .returning();
      if (!author) {
        throw notFound();
      }
      return author;
    },
  };
}
