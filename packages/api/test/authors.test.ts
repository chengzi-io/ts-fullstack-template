/** Demo — delete with the authors router. */
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

describe("authors", () => {
  it("creates an author with a trimmed name and reads it back", async () => {
    const created = await caller.authors.create({ name: "  Ada  " });

    expect(created.name).toBe("Ada");
    await expect(caller.authors.byId({ id: created.id })).resolves.toEqual(
      created
    );
  });

  it("rejects a blank name", async () => {
    await expect(caller.authors.create({ name: "   " })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("lists newest first with page metadata", async () => {
    await caller.authors.create({ name: "first" });
    await caller.authors.create({ name: "second" });
    await caller.authors.create({ name: "third" });

    const page = await caller.authors.list({ page: 1, pageSize: 2 });

    expect(page.items.map((author) => author.name)).toEqual([
      "third",
      "second",
    ]);
    expect(page).toMatchObject({
      page: 1,
      pageCount: 2,
      pageSize: 2,
      total: 3,
    });
  });

  it("renames an author", async () => {
    const { id } = await caller.authors.create({ name: "Ada" });

    const updated = await caller.authors.update({ id, name: "Grace" });

    expect(updated.name).toBe("Grace");
  });

  it("rejects an update without fields", async () => {
    const { id } = await caller.authors.create({ name: "Ada" });

    await expect(caller.authors.update({ id })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("reports NOT_FOUND for a missing author", async () => {
    await expect(caller.authors.byId({ id: 999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      caller.authors.update({ id: 999, name: "x" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(caller.authors.delete({ id: 999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("deletes an author without posts", async () => {
    const { id } = await caller.authors.create({ name: "Ada" });

    await expect(caller.authors.delete({ id })).resolves.toEqual({ ok: true });
    await expect(caller.authors.byId({ id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("refuses to delete an author who still has posts", async () => {
    const { id } = await caller.authors.create({ name: "Ada" });
    await caller.posts.create({ authorId: id, title: "Hello" });

    await expect(caller.authors.delete({ id })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});
