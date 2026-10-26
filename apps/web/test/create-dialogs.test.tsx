/** Demo — delete with the authors / posts features. */
import { QueryClientProvider } from "@tanstack/react-query";
import { act, render } from "@testing-library/react";
import { Profiler } from "react";
import { expect, it } from "vitest";

import { CreateDialogs } from "@/components/app/create-dialogs.tsx";
import { queryClient } from "@/lib/query-client.ts";

const IDLE_WINDOW_MS = 100;

function waitIdle() {
  return act(async () => {
    await new Promise((resolve) => setTimeout(resolve, IDLE_WINDOW_MS));
  });
}

// Mounted at the root, so they are on every page: any idle re-render loop
// burns CPU app-wide without failing anything else.
it("does not re-render while every dialog is closed", async () => {
  let commits = 0;
  const countCommit = () => {
    commits += 1;
  };
  render(
    <Profiler id="dialogs" onRender={countCommit}>
      <QueryClientProvider client={queryClient}>
        <CreateDialogs />
      </QueryClientProvider>
    </Profiler>
  );
  // Query notifications from mount land on the next tick; measure after them.
  await waitIdle();
  const settledCommits = commits;

  await waitIdle();

  expect(commits - settledCommits).toBe(0);
});
