/** Demo — delete with the authors / posts features. */
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RouterOutputs } from "@workspace/api";
import { expect, test, vi } from "vitest";

import { renderApp } from "./app.tsx";
import { server, TrpcError, trpc } from "./msw.ts";

type Author = RouterOutputs["authors"]["byId"];

test("keeps the delete dialog open with the server's reason", async () => {
  const user = userEvent.setup();
  const reported = vi
    .spyOn(console, "error")
    .mockImplementation(() => undefined);
  const reports = () =>
    reported.mock.calls.filter(([label]) => label === "Unexpected error:");
  const authors: Author[] = [{ createdAt: new Date(), id: 1, name: "Ada" }];
  try {
    server.use(
      trpc({
        "authors.delete": () => {
          // The API marks a domain failure (a restricted delete) expected.
          throw new TrpcError("CONFLICT", "Author is still in use", {
            expected: true,
          });
        },
        "authors.list": () => ({
          items: authors,
          page: 1,
          pageCount: 1,
          pageSize: 20,
          total: authors.length,
        }),
      })
    );
    renderApp("/authors");

    await screen.findByText("Ada");
    await user.click(screen.getByRole("button", { name: "Actions for Ada" }));
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog", {
      name: "Delete author?",
    });
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(
      await within(dialog).findByText("Author is still in use")
    ).toBeTruthy();
    expect(screen.getByRole("dialog", { name: "Delete author?" })).toBeTruthy();
    expect(screen.getByText("Ada")).toBeTruthy();
    // Shown inline, so it is no unexpected error.
    expect(reports()).toEqual([]);
  } finally {
    reported.mockRestore();
  }
});
