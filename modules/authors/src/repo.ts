import {
  containsText,
  type Executor,
  isForeignKeyViolation,
} from "@workspace/db";
import { ConflictError, NotFoundError } from "@workspace/kernel/errors";
import {
  paginationOffset,
  toPaginatedResult,
} from "@workspace/kernel/pagination";
import { desc, eq } from "drizzle-orm";

import type {
  Author,
  CreateAuthorInput,
  ListAuthorsInput,
  ListAuthorsResult,
  UpdateAuthorPatch,
} from "./contract.js";
import { authorsTable } from "./schema.js";

const notFound = () => new NotFoundError("Author not found");

/**
 * The only code that touches `authorsTable`. Expected failures are thrown as
 * `@workspace/kernel/errors`. Pass a transaction to join a larger unit of work.
 */
export function createAuthorsRepo(db: Executor) {
  return {
    /** NotFoundError when missing. */
    async byId(id: number): Promise<Author> {
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

    async create(input: CreateAuthorInput): Promise<Author> {
      const [author] = await db
        .insert(authorsTable)
        .values({ name: input.name })
        .returning();
      return author;
    },

    /** NotFoundError when missing; ConflictError while other rows reference it. */
    async delete(id: number): Promise<void> {
      // Referencing rows make the FK restrict the delete; the database
      // decides, so there is no check-then-delete race.
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

    async list(query: ListAuthorsInput): Promise<ListAuthorsResult> {
      const { page, pageSize, q } = query;
      const where = q ? containsText(authorsTable.name, q) : undefined;

      const [items, total] = await Promise.all([
        db
          .select()
          .from(authorsTable)
          .where(where)
          .orderBy(desc(authorsTable.createdAt), desc(authorsTable.id))
          .limit(pageSize)
          .offset(paginationOffset(page, pageSize)),
        db.$count(authorsTable, where),
      ]);

      return toPaginatedResult(items, total, page, pageSize);
    },

    /** NotFoundError when missing. */
    async update(id: number, patch: UpdateAuthorPatch): Promise<Author> {
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
