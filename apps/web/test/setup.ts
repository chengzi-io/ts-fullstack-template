import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

import { queryClient } from "@/lib/query-client.ts";

import { server } from "./msw.ts";

// Resets every feature store after each test (see __mocks__/zustand.ts).
vi.mock("zustand");

beforeAll(() => {
  // A request without a handler fails the test instead of silently hanging.
  server.listen({ onUnhandledFrame: "error" });
});

// The query client is an app singleton; clear it per test.
afterEach(() => {
  cleanup();
  server.resetHandlers();
  queryClient.clear();
});

afterAll(() => {
  server.close();
});
