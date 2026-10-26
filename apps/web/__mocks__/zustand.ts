// Zustand's documented testing setup: every store created during a test file
// is reset to its initial state after each test, with no store registry.
// Activated by `vi.mock("zustand")` in test/setup.ts.
import { act } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import type * as Zustand from "zustand";

// biome-ignore lint/performance/noBarrelFile: the mock must expose zustand's full API
export * from "zustand";

const { create: actualCreate } =
  await vi.importActual<typeof Zustand>("zustand");

const resets = new Set<() => void>();

function createTracked<T>(stateCreator: Zustand.StateCreator<T>) {
  const store = actualCreate(stateCreator);
  const initialState = store.getInitialState();
  resets.add(() => {
    store.setState(initialState, true);
  });
  return store;
}

// Supports both `create(fn)` and the curried `create<T>()(fn)`.
export const create = (<T>(stateCreator?: Zustand.StateCreator<T>) =>
  stateCreator
    ? createTracked(stateCreator)
    : createTracked) as typeof Zustand.create;

afterEach(() => {
  act(() => {
    for (const reset of resets) {
      reset();
    }
  });
});
