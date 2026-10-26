/** Demo — delete with the authors / posts features. */
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RouterInputs, RouterOutputs } from "@workspace/api";
import { expect, it } from "vitest";

import { renderApp } from "./app.tsx";
import { server, trpc } from "./msw.ts";

type Author = RouterOutputs["authors"]["byId"];
type Post = RouterOutputs["posts"]["byId"];

const IDLE_WINDOW_MS = 100;

/** In-memory stand-in for the procedures the posts page calls. */
function serveBackend() {
  const authors: Author[] = [];
  const posts: Post[] = [];
  const page = <T,>(items: T[], input: unknown) => {
    const { page: number = 1, pageSize = 20 } = (input ?? {}) as {
      page?: number;
      pageSize?: number;
    };
    return {
      items: items.slice((number - 1) * pageSize, number * pageSize),
      page: number,
      pageCount: Math.ceil(items.length / pageSize),
      pageSize,
      total: items.length,
    };
  };

  server.use(
    trpc({
      "authors.create": (input) => {
        const { name } = input as RouterInputs["authors"]["create"];
        const author = { createdAt: new Date(), id: authors.length + 1, name };
        authors.unshift(author);
        return author;
      },
      "authors.list": (input) => page(authors, input),
      "posts.byId": (input) => {
        const { id } = input as RouterInputs["posts"]["byId"];
        return posts.find((post) => post.id === id);
      },
      "posts.create": (input) => {
        const { authorId, body, title } =
          input as RouterInputs["posts"]["create"];
        const author = authors.find(({ id }) => id === authorId);
        if (!author) {
          throw new Error(`Unknown author ${authorId}`);
        }
        const now = new Date();
        const post = {
          author: { id: author.id, name: author.name },
          authorId,
          body: body ?? null,
          createdAt: now,
          id: posts.length + 1,
          title,
          updatedAt: now,
        };
        posts.unshift(post);
        return post;
      },
      "posts.list": (input) => page(posts, input),
      "posts.update": (input) => {
        const { id, ...patch } = input as RouterInputs["posts"]["update"];
        const post = posts.find((candidate) => candidate.id === id);
        if (!post) {
          throw new Error(`Unknown post ${id}`);
        }
        Object.assign(post, patch);
        return post;
      },
    })
  );

  return { authors, posts };
}

function waitIdle() {
  return act(async () => {
    await new Promise((resolve) => setTimeout(resolve, IDLE_WINDOW_MS));
  });
}

it("creates the first post, creating its author on the way", async () => {
  const user = userEvent.setup();
  const backend = serveBackend();
  renderApp("/posts");

  await screen.findByText("No posts yet");
  await user.click(screen.getByRole("button", { name: "New" }));
  await user.click(
    await screen.findByRole("button", { name: "Create author" })
  );

  const authorDialog = await screen.findByRole("dialog", {
    name: "New author",
  });
  await user.type(within(authorDialog).getByLabelText("Name"), "Ada");
  await user.click(
    within(authorDialog).getByRole("button", { name: "Create author" })
  );

  const postDialog = await screen.findByRole("dialog", { name: "New post" });
  await user.type(await within(postDialog).findByLabelText("Title"), "Hello");
  await user.click(
    within(postDialog).getByRole("button", { name: "Create post" })
  );

  await waitFor(() => {
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  expect(await screen.findByText("Hello")).toBeTruthy();
  expect(backend.posts).toMatchObject([
    { author: { name: "Ada" }, title: "Hello" },
  ]);
});

// Any idle re-render loop on a page burns CPU without failing anything else.
it("does not re-render while idle", async () => {
  serveBackend();
  let commits = 0;
  const countCommit = () => {
    commits += 1;
  };
  renderApp("/posts", countCommit);
  await screen.findByText("No posts yet");
  await waitIdle();
  const settledCommits = commits;

  await waitIdle();

  expect(commits - settledCommits).toBe(0);
});

it("pages through more posts than fit on one page", async () => {
  const user = userEvent.setup();
  const backend = serveBackend();
  const ada = { createdAt: new Date(), id: 1, name: "Ada" };
  backend.authors.push(ada);
  for (let n = 1; n <= 25; n += 1) {
    const now = new Date();
    backend.posts.unshift({
      author: { id: ada.id, name: ada.name },
      authorId: ada.id,
      body: null,
      createdAt: now,
      id: n,
      title: `Post ${n}`,
      updatedAt: now,
    });
  }
  const router = renderApp("/posts");

  expect(await screen.findByText("Post 25")).toBeTruthy();
  expect(screen.queryByText("Post 5")).toBeNull();

  await user.click(screen.getByRole("button", { name: "Next page" }));

  expect(await screen.findByText("Post 5")).toBeTruthy();
  expect(screen.queryByText("Post 25")).toBeNull();
  expect(router.state.location.search).toMatchObject({ page: 2 });
});

it("keeps an edited post's author even when it is not among the first authors", async () => {
  const user = userEvent.setup();
  const backend = serveBackend();
  for (let n = 1; n <= 25; n += 1) {
    backend.authors.unshift({
      createdAt: new Date(),
      id: n,
      name: `Author ${n}`,
    });
  }
  const now = new Date();
  backend.posts.push({
    author: { id: 1, name: "Author 1" },
    authorId: 1,
    body: null,
    createdAt: now,
    id: 1,
    title: "By the oldest author",
    updatedAt: now,
  });
  renderApp("/posts");

  await user.click(
    await screen.findByRole("button", {
      name: "Actions for By the oldest author",
    })
  );
  await user.click(await screen.findByRole("menuitem", { name: "Edit" }));
  const dialog = await screen.findByRole("dialog", { name: "Edit post" });
  expect(await within(dialog).findByDisplayValue("Author 1")).toBeTruthy();
  await user.click(
    within(dialog).getByRole("button", { name: "Save changes" })
  );

  await waitFor(() => {
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  expect(backend.posts[0]).toMatchObject({ authorId: 1 });
});
