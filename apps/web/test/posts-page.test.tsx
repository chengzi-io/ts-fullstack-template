/** Demo — delete with the authors / posts features. */
import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RouterInputs, RouterOutputs } from "@workspace/api";
import { Profiler } from "react";
import { expect, it } from "vitest";

import { queryClient } from "@/lib/query-client.ts";
import { Route } from "@/routes/posts/index.tsx";

import { server, trpc } from "./msw.ts";

type Author = RouterOutputs["authors"]["byId"];
type Post = RouterOutputs["posts"]["byId"];

const IDLE_WINDOW_MS = 100;

/** In-memory stand-in for the procedures the posts page calls. */
function serveBackend() {
  const authors: Author[] = [];
  const posts: Post[] = [];
  const page = <T,>(items: T[]) => ({
    items,
    page: 1,
    pageCount: items.length > 0 ? 1 : 0,
    pageSize: 20,
    total: items.length,
  });

  server.use(
    trpc({
      "authors.create": (input) => {
        const { name } = input as RouterInputs["authors"]["create"];
        const author = { createdAt: new Date(), id: authors.length + 1, name };
        authors.unshift(author);
        return author;
      },
      "authors.list": () => page(authors),
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
      "posts.list": () => page(posts),
    })
  );

  return { posts };
}

const ignoreCommit = () => undefined;

function renderPostsPage(onCommit: () => void = ignoreCommit) {
  const PostsPage = Route.options.component;
  if (!PostsPage) {
    throw new Error("The /posts route has no component");
  }
  render(
    <Profiler id="posts-page" onRender={onCommit}>
      <QueryClientProvider client={queryClient}>
        <PostsPage />
      </QueryClientProvider>
    </Profiler>
  );
}

function waitIdle() {
  return act(async () => {
    await new Promise((resolve) => setTimeout(resolve, IDLE_WINDOW_MS));
  });
}

it("creates the first post, creating its author on the way", async () => {
  const user = userEvent.setup();
  const backend = serveBackend();
  renderPostsPage();

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
  renderPostsPage(countCommit);
  await screen.findByText("No posts yet");
  await waitIdle();
  const settledCommits = commits;

  await waitIdle();

  expect(commits - settledCommits).toBe(0);
});
