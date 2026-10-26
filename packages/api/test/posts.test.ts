/** Demo — delete with the posts router. */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestCaller, type TestCaller } from "./caller.js";

let caller: TestCaller;
let dispose: () => Promise<void>;

beforeEach(async () => {
  ({ caller, dispose } = await createTestCaller());
});

afterEach(async () => {
  await dispose();
});

describe("posts", () => {
  it("creates a post that embeds its author", async () => {
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

  it("rejects a post for an unknown author", async () => {
    await expect(
      caller.posts.create({ authorId: 999, title: "Hello" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("filters the list by author", async () => {
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

  it("updates only the fields it is given", async () => {
    const author = await caller.authors.create({ name: "Ada" });
    const post = await caller.posts.create({
      authorId: author.id,
      body: "original body",
      title: "Hello",
    });

    const updated = await caller.posts.update({ id: post.id, title: "Hi" });

    expect(updated).toMatchObject({ body: "original body", title: "Hi" });
  });

  it("rejects moving a post to an unknown author", async () => {
    const author = await caller.authors.create({ name: "Ada" });
    const post = await caller.posts.create({
      authorId: author.id,
      title: "Hello",
    });

    await expect(
      caller.posts.update({ authorId: 999, id: post.id })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("reports NOT_FOUND for a missing post", async () => {
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

  it("deletes a post", async () => {
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
});
