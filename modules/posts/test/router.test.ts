/** Demo — delete with the posts module. */
import { authorsRouter } from "@workspace/authors/router";
import { createTestContext } from "@workspace/kernel/testing";
import { createCallerFactory, createTRPCRouter } from "@workspace/kernel/trpc";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { postsRouter } from "../src/router.js";

const createCaller = createCallerFactory(
  createTRPCRouter({ authors: authorsRouter, posts: postsRouter })
);

let caller: ReturnType<typeof createCaller>;
let dispose: () => Promise<void>;

beforeEach(async () => {
  const context = await createTestContext();
  caller = createCaller(context.ctx);
  ({ dispose } = context);
});

afterEach(async () => {
  await dispose();
});

describe("posts", () => {
  test("creates a post that embeds its author", async () => {
    const author = await caller.authors.create({ name: "Ada" });

    const post = await caller.posts.create({
      authorId: author.id,
      title: "Hello",
    });

    expect(post).toMatchObject({
      author: { id: author.id, name: "Ada" },
      body: null,
      title: "Hello",
    });
    await expect(caller.posts.byId({ id: post.id })).resolves.toEqual(post);
  });

  test("rejects a post for an unknown author", async () => {
    await expect(
      caller.posts.create({ authorId: 999, title: "Hello" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  test("filters the list by author", async () => {
    const ada = await caller.authors.create({ name: "Ada" });
    const grace = await caller.authors.create({ name: "Grace" });
    await caller.posts.create({ authorId: ada.id, title: "by Ada" });
    await caller.posts.create({ authorId: grace.id, title: "by Grace" });

    const page = await caller.posts.list({ authorId: grace.id });

    expect(page.total).toBe(1);
    expect(page.items).toMatchObject([
      { author: { name: "Grace" }, title: "by Grace" },
    ]);
  });

  test("searches titles, bodies, and author names", async () => {
    const ada = await caller.authors.create({ name: "Ada" });
    const grace = await caller.authors.create({ name: "Grace" });
    await caller.posts.create({ authorId: ada.id, title: "Hello" });
    await caller.posts.create({
      authorId: grace.id,
      body: "hello again",
      title: "World",
    });

    const byText = await caller.posts.list({ q: "hello" });
    const byAuthor = await caller.posts.list({ q: "grace" });

    expect(byText.total).toBe(2);
    expect(byAuthor).toMatchObject({ items: [{ title: "World" }], total: 1 });
  });

  test("updates only the fields it is given", async () => {
    const author = await caller.authors.create({ name: "Ada" });
    const post = await caller.posts.create({
      authorId: author.id,
      body: "original body",
      title: "Hello",
    });

    const updated = await caller.posts.update({ id: post.id, title: "Hi" });

    expect(updated).toMatchObject({ body: "original body", title: "Hi" });
  });

  test("rejects moving a post to an unknown author", async () => {
    const author = await caller.authors.create({ name: "Ada" });
    const post = await caller.posts.create({
      authorId: author.id,
      title: "Hello",
    });

    await expect(
      caller.posts.update({ authorId: 999, id: post.id })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  test("reports NOT_FOUND for a missing post", async () => {
    await expect(caller.posts.byId({ id: 999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      caller.posts.update({ id: 999, title: "x" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(caller.posts.delete({ id: 999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  test("deletes a post", async () => {
    const author = await caller.authors.create({ name: "Ada" });
    const { id } = await caller.posts.create({
      authorId: author.id,
      title: "Hello",
    });

    await expect(caller.posts.delete({ id })).resolves.toEqual({ ok: true });
    await expect(caller.posts.byId({ id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  test("keeps an author who still has posts", async () => {
    const { id } = await caller.authors.create({ name: "Ada" });
    await caller.posts.create({ authorId: id, title: "Hello" });

    await expect(caller.authors.delete({ id })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});
