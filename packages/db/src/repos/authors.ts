import type {
  AuthorsRepo,
  CreateAuthorInput,
  UpdateAuthorPatch,
} from "@workspace/domain/authors";
import {
  paginationOffset,
  toPaginatedResult,
} from "@workspace/domain/pagination";
import { desc, eq } from "drizzle-orm";

import type { Database } from "../index.js";
import { authorsTable } from "../schema/authors.js";
import { postsTable } from "../schema/posts.js";

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

    async delete(id) {
      const existing = await db
        .select({ id: authorsTable.id })
        .from(authorsTable)
        .where(eq(authorsTable.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!existing) {
        return "not_found";
      }

      const postCount = await db.$count(
        postsTable,
        eq(postsTable.authorId, id)
      );
      if (postCount > 0) {
        return "has_posts";
      }

      await db.delete(authorsTable).where(eq(authorsTable.id, id));
      return "deleted";
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
      const values = toUpdateValues(patch);
      if (Object.keys(values).length === 0) {
        return this.byId(id);
      }

      const [author] = await db
        .update(authorsTable)
        .set(values)
        .where(eq(authorsTable.id, id))
        .returning();

      return author ?? null;
    },
  };
}

function toInsertValues(input: CreateAuthorInput): NewAuthor {
  return {
    name: input.name,
  };
}

function toUpdateValues(patch: UpdateAuthorPatch): Partial<NewAuthor> {
  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined)
  ) as Partial<NewAuthor>;
}
