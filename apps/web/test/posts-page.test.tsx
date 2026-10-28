/** Demo — delete with the authors / posts features. */
import { act, screen, waitFor, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import userEvent from "@testing-library/user-event";
import type { RouterInputs, RouterOutputs } from "@workspace/api";
import { expect, it } from "vitest";

import { renderApp } from "./app.tsx";
import { server, trpc } from "./msw.ts";

type Author = RouterOutputs["authors"]["byId"];
type Post = RouterOutputs["posts"]["byId"];

const IDLE_WINDOW_MS = 100;
const SETTLE_WINDOWS = 20;

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
      "authors.list": (input) => {
        const { q } = (input ?? {}) as { q?: string };
        const needle = q?.toLowerCase() ?? "";
        const matches = needle
          ? authors.filter((author) =>
              author.name.toLowerCase().includes(needle)
            )
          : authors;
        return page(matches, input);
      },
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

/**
 * Waits for a whole idle window without a commit. One late commit (a lazy
 * chunk landing on a slow runner) settles; a render loop never does.
 */
async function waitUntilQuiet(
  readCommits: () => number,
  windowsLeft = SETTLE_WINDOWS
): Promise<void> {
  if (windowsLeft === 0) {
    throw new Error(`Still committing after ${SETTLE_WINDOWS} idle windows`);
  }
  const before = readCommits();
  await waitIdle();
  if (readCommits() !== before) {
    await waitUntilQuiet(readCommits, windowsLeft - 1);
  }
}

/** Types a query into the author combobox and picks the matching option. */
async function pickAuthor(
  user: UserEvent,
  dialog: HTMLElement,
  query: string,
  name: string
) {
  const input = within(dialog).getByLabelText("Author");
  await user.type(input, query);
  await user.click(await screen.findByRole("option", { name }));
  return input;
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
  await pickAuthor(user, postDialog, "Ada", "Ada");
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

it("does not create a post without an author", async () => {
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

  expect(await within(postDialog).findByText("Choose an author")).toBeTruthy();
  expect(backend.posts).toHaveLength(0);
});

it("keeps the picked author when the input is retyped and left without a pick", async () => {
  const user = userEvent.setup();
  const backend = serveBackend();
  backend.authors.push(
    { createdAt: new Date(), id: 1, name: "Ada" },
    { createdAt: new Date(), id: 2, name: "Bob" }
  );
  renderApp("/posts");

  await screen.findByText("No posts yet");
  await user.click(screen.getByRole("button", { name: "New" }));

  const dialog = await screen.findByRole("dialog", { name: "New post" });
  const input = await pickAuthor(user, dialog, "Ad", "Ada");

  await user.click(input);
  await user.keyboard("{Control>}a{/Control}");
  await user.type(input, "Bo");
  await screen.findByRole("option", { name: "Bob" });
  await user.click(within(dialog).getByLabelText("Title"));

  expect((input as HTMLInputElement).value).toBe("Ada");

  await user.type(within(dialog).getByLabelText("Title"), "Still Ada");
  await user.click(within(dialog).getByRole("button", { name: "Create post" }));

  await waitFor(() => {
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  expect(backend.posts).toMatchObject([{ authorId: 1, title: "Still Ada" }]);
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
  await waitUntilQuiet(() => commits);
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

it("creates a post for an author outside the first page of results", async () => {
  const user = userEvent.setup();
  const backend = serveBackend();
  for (let n = 1; n <= 25; n += 1) {
    backend.authors.push({
      createdAt: new Date(),
      id: n,
      name: `Author ${n}`,
    });
  }
  renderApp("/posts");

  await screen.findByText("No posts yet");
  await user.click(screen.getByRole("button", { name: "New" }));

  const dialog = await screen.findByRole("dialog", { name: "New post" });
  await pickAuthor(user, dialog, "Author 25", "Author 25");
  await user.type(within(dialog).getByLabelText("Title"), "Late author");
  await user.click(within(dialog).getByRole("button", { name: "Create post" }));

  await waitFor(() => {
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  expect(backend.posts).toMatchObject([{ authorId: 25 }]);
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
  const authorInput = within(dialog).getByLabelText("Author");
  expect((authorInput as HTMLInputElement).value).toBe("Author 1");
  await user.click(
    within(dialog).getByRole("button", { name: "Save changes" })
  );

  await waitFor(() => {
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  expect(backend.posts[0]).toMatchObject({ authorId: 1 });
});
