import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "@workspace/ui/components/toast";
import { describe, expect, test } from "vitest";

import { renderApp } from "./app.tsx";

describe("Toaster", () => {
  test("renders success and error toasts with title, description, and accessible region", async () => {
    renderApp("/");
    await screen.findByRole("button", { name: "Toggle theme" });

    act(() => {
      toast.success("Post saved", {
        description: "Your changes are live.",
      });
      toast.error("Save failed", {
        description: "Could not reach the server.",
      });
    });

    const region = await screen.findByRole("region", { name: "Notifications" });
    expect(region).toBeTruthy();

    await expect(screen.findByText("Post saved")).resolves.toBeTruthy();
    expect(screen.getByText("Your changes are live.")).toBeTruthy();
    expect(screen.getByText("Save failed")).toBeTruthy();
    expect(screen.getByText("Could not reach the server.")).toBeTruthy();

    const dialogs = screen.getAllByRole("dialog");
    expect(dialogs).toHaveLength(2);
    expect(dialogs.some((dialog) => dialog.dataset.type === "error")).toBe(
      true
    );
    expect(dialogs.some((dialog) => dialog.dataset.type === "success")).toBe(
      true
    );
  });

  test("does not leak open toasts from earlier tests", async () => {
    renderApp("/");
    await screen.findByRole("button", { name: "Toggle theme" });

    expect(screen.queryByText("Post saved")).toBeNull();
    expect(screen.queryByText("Save failed")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("closes a toast when its close button is clicked", async () => {
    const user = userEvent.setup();
    renderApp("/");
    await screen.findByRole("button", { name: "Toggle theme" });

    act(() => {
      toast.info("Draft discarded", {
        description: "Unsaved changes were cleared.",
      });
    });

    await expect(screen.findByText("Draft discarded")).resolves.toBeTruthy();

    const closeButton = screen.getByRole("button", { name: /close/iu });
    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText("Draft discarded")).toBeNull();
    });
  });

  test("leaves an open toast cleanly reset by afterEach", async () => {
    renderApp("/");
    await screen.findByRole("button", { name: "Toggle theme" });

    act(() => {
      toast.success("Ephemeral toast");
    });

    await expect(screen.findByText("Ephemeral toast")).resolves.toBeTruthy();
  });

  test("verifies prior open toast did not leak into the next test", async () => {
    renderApp("/");
    await screen.findByRole("button", { name: "Toggle theme" });

    expect(screen.queryByText("Ephemeral toast")).toBeNull();
  });
});
