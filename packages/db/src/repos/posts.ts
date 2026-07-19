import {
  paginationOffset,
  toPaginatedResult,
} from "@workspace/domain/pagination";
import type { CreatePostInput, Post, PostsRepo } from "@workspace/domain/posts";
import { desc, eq } from "drizzle-orm";

import type { Database } from "../index.js";
import { authorsTable } from "../schema/authors.js";
import { postsTable } from "../schema/posts.js";

type NewPost = typeof postsTable.$inferInsert;

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

export function createPostsRepo(db: Database): PostsRepo {
  return {
    async byId(id) {
      const [row] = await db
        .select(postSelect)
        .from(postsTable)
        .innerJoin(authorsTable, eq(postsTable.authorId, authorsTable.id))
        .where(eq(postsTable.id, id))
        .limit(1);
      return row ? toPost(row) : null;
    },

    async create(input) {
      const author = await db
        .select({ id: authorsTable.id, name: authorsTable.name })
        .from(authorsTable)
        .where(eq(authorsTable.id, input.authorId))
        .limit(1)
        .then((rows) => rows[0]);

      // null → router BAD_REQUEST (unknown authorId)
      if (!author) {
        return null;
      }

      const [inserted] = await db
        .insert(postsTable)
        .values(toInsertValues(input))
        .returning();

      if (!inserted) {
        throw new Error("Failed to create post");
      }

      return {
        author: { id: author.id, name: author.name },
        authorId: inserted.authorId,
        body: inserted.body,
        createdAt: inserted.createdAt,
        id: inserted.id,
        title: inserted.title,
        updatedAt: inserted.updatedAt,
      };
    },

    async delete(id) {
      const deleted = await db
        .delete(postsTable)
        .where(eq(postsTable.id, id))
        .returning({ id: postsTable.id });
      return deleted.length > 0;
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

function toInsertValues(input: CreatePostInput): NewPost {
  return {
    authorId: input.authorId,
    body: input.body ?? null,
    title: input.title,
  };
}
