import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

import { queryClient } from "@/lib/query-client.ts";

import { server } from "./msw.ts";

// Resets every feature store after each test (see __mocks__/zustand.ts).
vi.mock("zustand");

// jsdom has no matchMedia; the theme provider reads the system color scheme.
window.matchMedia = (query: string) =>
  ({
    addEventListener: () => undefined,
    matches: false,
    media: query,
    removeEventListener: () => undefined,
  }) as unknown as MediaQueryList;

beforeAll(() => {
  // A request without a handler fails the test instead of silently hanging.
  server.listen({ onUnhandledFrame: "error" });
});

// The query client is an app singleton and the theme persists to storage;
// clear both per test.
afterEach(() => {
  cleanup();
  server.resetHandlers();
  queryClient.clear();
  localStorage.clear();
});

afterAll(() => {
  server.close();
});
