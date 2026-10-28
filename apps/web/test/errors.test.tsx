import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";

import { queryClient } from "@/lib/query-client.ts";

import { renderApp } from "./app.tsx";
import { server, TrpcError, trpc } from "./msw.ts";

// Failures surface on the first attempt; retries would only slow the suite.
queryClient.setDefaultOptions({ queries: { retry: false } });

const emptyPage = { items: [], page: 1, pageCount: 0, pageSize: 20, total: 0 };

it("reports a failing posts.list once, with its request id", async () => {
  const reported = vi
    .spyOn(console, "error")
    .mockImplementation(() => undefined);
  try {
    server.use(
      trpc({
        "posts.list": () => {
          throw new TrpcError("INTERNAL_SERVER_ERROR", "boom", {
            requestId: "req-1",
          });
        },
      })
    );
    renderApp("/posts");

    expect(await screen.findByText("Failed to load posts")).toBeTruthy();
    await waitFor(() => expect(reported).toHaveBeenCalledTimes(1));

    const [, message, detail] = reported.mock.calls[0];
    expect(message).toBe("boom");
    expect(detail).toMatchObject({
      context: { key: expect.any(Array), scope: "query" },
      requestId: "req-1",
    });
  } finally {
    reported.mockRestore();
  }
});

it("shows the route error with its request id and recovers on Try again", async () => {
  const user = userEvent.setup();
  const reported = vi
    .spyOn(console, "error")
    .mockImplementation(() => undefined);
  const reports = () =>
    reported.mock.calls.filter(([label]) => label === "Unexpected error:");
  let healthy = false;
  // A failed query is not something the posts page can render, so it reaches
  // the route error boundary like any other render crash.
  queryClient.setDefaultOptions({
    queries: { retry: false, throwOnError: true },
  });
  try {
    server.use(
      trpc({
        "posts.list": () => {
          if (!healthy) {
            throw new TrpcError("INTERNAL_SERVER_ERROR", "boom", {
              requestId: "req-42",
            });
          }
          return emptyPage;
        },
      })
    );
    renderApp("/posts");

    expect(await screen.findByText("Something went wrong")).toBeTruthy();
    expect(screen.getByText("boom")).toBeTruthy();
    expect(screen.getByText("Request id: req-42")).toBeTruthy();
    // The query cache and the route boundary both see this error.
    expect(reports()).toHaveLength(1);
    expect(reports()[0][2]).toMatchObject({ requestId: "req-42" });

    healthy = true;
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("No posts yet")).toBeTruthy();
    expect(screen.queryByText("Something went wrong")).toBeNull();
  } finally {
    queryClient.setDefaultOptions({
      queries: { retry: false, throwOnError: false },
    });
    reported.mockRestore();
  }
});
