import type { AuthorsRepo, CreateAuthorInput } from "@workspace/domain/authors";
import {
  paginationOffset,
  toPaginatedResult,
} from "@workspace/domain/pagination";
import { desc, eq } from "drizzle-orm";

import type { Database } from "../index.js";
import { authorsTable } from "../schema/authors.js";

type NewAuthor = typeof authorsTable.$inferInsert;

export function createAuthorsRepo(db: Database): AuthorsRepo {
  return {
    async byId(id) {
      const [author] = await db
        .select()
        .from(authorsTable)
        .where(eq(authorsTable.id, id))
        .limit(1);
      return author ?? null;
    },

    async create(input) {
      const [author] = await db
        .insert(authorsTable)
        .values(toInsertValues(input))
        .returning();

      if (!author) {
        throw new Error("Failed to create author");
      }

      return author;
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
  };
}

function toInsertValues(input: CreateAuthorInput): NewAuthor {
  return {
    name: input.name,
  };
}
