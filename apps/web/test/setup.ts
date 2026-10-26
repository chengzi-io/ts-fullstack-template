import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";

import { queryClient } from "@/lib/query-client.ts";
import { useUiStore } from "@/stores/index.ts";

import { server } from "./msw.ts";

beforeAll(() => {
  // A request without a handler fails the test instead of silently hanging.
  server.listen({ onUnhandledFrame: "error" });
});

// The query client and UI store are app singletons; reset them per test.
afterEach(() => {
  cleanup();
  server.resetHandlers();
  queryClient.clear();
  useUiStore.setState(useUiStore.getInitialState(), true);
});

afterAll(() => {
  server.close();
});
