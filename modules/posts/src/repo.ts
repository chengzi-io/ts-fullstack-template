import { authorsTable } from "@workspace/authors/schema";
import {
  containsText,
  type Executor,
  isForeignKeyViolation,
} from "@workspace/db";
import { InvalidReferenceError, NotFoundError } from "@workspace/kernel/errors";
import {
  paginationOffset,
  toPaginatedResult,
} from "@workspace/kernel/pagination";
import { and, count, desc, eq, or } from "drizzle-orm";

import type {
  CreatePostInput,
  ListPostsInput,
  ListPostsResult,
  Post,
  UpdatePostPatch,
} from "./contract.js";
import { postsTable } from "./schema.js";

const postSelect = {
  authorId: postsTable.authorId,
  authorName: authorsTable.name,
  body: postsTable.body,
  createdAt: postsTable.createdAt,
  id: postsTable.id,
  title: postsTable.title,
  updatedAt: postsTable.updatedAt,
};

interface PostRow {
  authorId: number;
  authorName: string;
  body: string | null;
  createdAt: Date;
  id: number;
  title: string;
  updatedAt: Date;
}

const notFound = () => new NotFoundError("Post not found");

/** The FK on authorId is the existence check — no lookup-then-write race. */
function rejectUnknownAuthor(error: unknown): never {
  throw isForeignKeyViolation(error)
    ? new InvalidReferenceError("Author not found", { cause: error })
    : error;
}

/**
 * The only code that writes `postsTable` (it joins authors read-only for the
 * embedded summary). Pass a transaction to join a larger unit of work.
 */
export function createPostsRepo(db: Executor) {
  /** NotFoundError when missing. */
  async function byId(id: number): Promise<Post> {
    const [row] = await db
      .select(postSelect)
      .from(postsTable)
      .innerJoin(authorsTable, eq(postsTable.authorId, authorsTable.id))
      .where(eq(postsTable.id, id))
      .limit(1);
    if (!row) {
      throw notFound();
    }
    return toPost(row);
  }

  return {
    byId,

    /** InvalidReferenceError for an unknown authorId. */
    async create(input: CreatePostInput): Promise<Post> {
      const [inserted] = await db
        .insert(postsTable)
        .values({
          authorId: input.authorId,
          body: input.body ?? null,
          title: input.title,
        })
        .returning({ id: postsTable.id })
        .catch(rejectUnknownAuthor);
      return byId(inserted.id);
    },

    /** NotFoundError when missing. */
    async delete(id: number): Promise<void> {
      const deleted = await db
        .delete(postsTable)
        .where(eq(postsTable.id, id))
        .returning({ id: postsTable.id });
      if (deleted.length === 0) {
        throw notFound();
      }
    },

    async list(query: ListPostsInput): Promise<ListPostsResult> {
      const { authorId, page, pageSize, q } = query;
      const where = and(
        authorId === undefined ? undefined : eq(postsTable.authorId, authorId),
        q
          ? or(
              containsText(postsTable.title, q),
              containsText(postsTable.body, q),
              containsText(authorsTable.name, q)
            )
          : undefined
      );

      // The author-name filter needs the join, so the count joins too.
      const [rows, [{ total }]] = await Promise.all([
        db
          .select(postSelect)
          .from(postsTable)
          .innerJoin(authorsTable, eq(postsTable.authorId, authorsTable.id))
          .where(where)
          .orderBy(desc(postsTable.createdAt), desc(postsTable.id))
          .limit(pageSize)
          .offset(paginationOffset(page, pageSize)),
        db
          .select({ total: count() })
          .from(postsTable)
          .innerJoin(authorsTable, eq(postsTable.authorId, authorsTable.id))
          .where(where),
      ]);

      return toPaginatedResult(rows.map(toPost), total, page, pageSize);
    },

    /** NotFoundError when missing; InvalidReferenceError for an unknown authorId. */
    async update(id: number, patch: UpdatePostPatch): Promise<Post> {
      const updated = await db
        .update(postsTable)
        .set(patch)
        .where(eq(postsTable.id, id))
        .returning({ id: postsTable.id })
        .catch(rejectUnknownAuthor);
      if (updated.length === 0) {
        throw notFound();
      }
      return byId(id);
    },
  };
}

function toPost(row: PostRow): Post {
  return {
    author: { id: row.authorId, name: row.authorName },
    authorId: row.authorId,
    body: row.body,
    createdAt: row.createdAt,
    id: row.id,
    title: row.title,
    updatedAt: row.updatedAt,
  };
}
