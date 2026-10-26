import { InvalidReferenceError, NotFoundError } from "@workspace/domain/errors";
import {
  paginationOffset,
  toPaginatedResult,
} from "@workspace/domain/pagination";
import type { Post, PostsRepo } from "@workspace/domain/posts";
import { desc, eq } from "drizzle-orm";

import { type Database, isForeignKeyViolation } from "../index.js";
import { authorsTable } from "../schema/authors.js";
import { postsTable } from "../schema/posts.js";

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

export function createPostsRepo(db: Database): PostsRepo {
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

    async create(input) {
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

    async delete(id) {
      const deleted = await db
        .delete(postsTable)
        .where(eq(postsTable.id, id))
        .returning({ id: postsTable.id });
      if (deleted.length === 0) {
        throw notFound();
      }
    },

    async list(query) {
      const { authorId, page, pageSize } = query;
      const where =
        authorId === undefined ? undefined : eq(postsTable.authorId, authorId);

      const [rows, total] = await Promise.all([
        db
          .select(postSelect)
          .from(postsTable)
          .innerJoin(authorsTable, eq(postsTable.authorId, authorsTable.id))
          .where(where)
          .orderBy(desc(postsTable.createdAt), desc(postsTable.id))
          .limit(pageSize)
          .offset(paginationOffset(page, pageSize)),
        db.$count(postsTable, where),
      ]);

      return toPaginatedResult(rows.map(toPost), total, page, pageSize);
    },

    async update(id, patch) {
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
