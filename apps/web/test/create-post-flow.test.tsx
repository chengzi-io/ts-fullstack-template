/** Demo — delete with the authors / posts features. */
import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RouterInputs, RouterOutputs } from "@workspace/api";
import { expect, it } from "vitest";

import { CreateDialogs } from "@/components/app/create-dialogs.tsx";
import { queryClient } from "@/lib/query-client.ts";
import { useUiStore } from "@/stores/index.ts";

import { server, trpc } from "./msw.ts";

type Author = RouterOutputs["authors"]["byId"];
type Post = RouterOutputs["posts"]["byId"];

/** In-memory stand-in for the procedures this flow calls. */
function serveBackend() {
  const authors: Author[] = [];
  const posts: Post[] = [];

  server.use(
    trpc({
      "authors.create": (input) => {
        const { name } = input as RouterInputs["authors"]["create"];
        const author = { createdAt: new Date(), id: authors.length + 1, name };
        authors.push(author);
        return author;
      },
      "authors.list": () => ({
        items: authors,
        page: 1,
        pageCount: authors.length > 0 ? 1 : 0,
        pageSize: 20,
        total: authors.length,
      }),
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
        posts.push(post);
        return post;
      },
    })
  );

  return { posts };
}

function renderDialogs() {
  render(
    <QueryClientProvider client={queryClient}>
      <CreateDialogs />
    </QueryClientProvider>
  );
}

it("resumes post creation after creating the first author", async () => {
  const user = userEvent.setup();
  const backend = serveBackend();
  renderDialogs();

  act(() => {
    useUiStore.getState().postActions.openCreate();
  });
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
  expect(backend.posts).toMatchObject([
    { author: { name: "Ada" }, title: "Hello" },
  ]);
});
