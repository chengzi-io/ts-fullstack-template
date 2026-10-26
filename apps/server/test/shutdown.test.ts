import { describe, expect, it, vi } from "vitest";

import { createShutdown } from "../src/lib/shutdown.js";

/** Drives shutdown by hand: no real timers, sockets, or process.exit. */
function createHarness(options: { closeDatabase?: () => void } = {}) {
  let finishHttpClose: (error?: Error) => void = () => undefined;
  let fireTimeout: () => void = () => undefined;

  const server = {
    close: vi.fn((callback: (error?: Error) => void) => {
      finishHttpClose = callback;
    }),
    closeAllConnections: vi.fn(),
  };
  const closeDatabase = vi.fn(options.closeDatabase ?? (() => undefined));
  const exit = vi.fn<(code: number) => void>();

  const shutdown = createShutdown({
    clearTimeout: () => undefined,
    closeDatabase,
    exit,
    log: { error: () => undefined, info: () => undefined },
    server,
    setTimeout: (callback) => {
      fireTimeout = callback;
      return {};
    },
    timeoutMs: 1000,
  });

  return {
    closeDatabase,
    exit,
    finishHttpClose: (error?: Error) => finishHttpClose(error),
    fireTimeout: () => fireTimeout(),
    server,
    shutdown,
  };
}

describe("shutdown", () => {
  it("drains HTTP before closing the database, then exits 0", async () => {
    const h = createHarness();

    const done = h.shutdown({ reason: "SIGTERM" });
    expect(h.closeDatabase).not.toHaveBeenCalled();

    h.finishHttpClose();
    await done;

    expect(h.closeDatabase).toHaveBeenCalledOnce();
    expect(h.exit.mock.calls).toEqual([[0]]);
  });

  it("runs once no matter how many signals arrive", async () => {
    const h = createHarness();

    const first = h.shutdown({ reason: "SIGTERM" });
    const second = h.shutdown({ reason: "SIGINT" });
    h.finishHttpClose();
    await Promise.all([first, second]);

    expect(second).toBe(first);
    expect(h.server.close).toHaveBeenCalledOnce();
    expect(h.exit.mock.calls).toEqual([[0]]);
  });

  it("keeps the worst exit code requested while draining", async () => {
    const h = createHarness();

    const done = h.shutdown({ reason: "SIGTERM" });
    h.shutdown({ exitCode: 1, reason: "uncaughtException" });
    h.finishHttpClose();
    await done;

    expect(h.exit.mock.calls).toEqual([[1]]);
  });

  it("force-closes connections and exits 1 after the timeout", async () => {
    const h = createHarness();

    const done = h.shutdown({ reason: "SIGTERM" });
    h.fireTimeout();
    await done;
    h.finishHttpClose();

    expect(h.server.closeAllConnections).toHaveBeenCalledOnce();
    expect(h.closeDatabase).toHaveBeenCalledOnce();
    expect(h.exit.mock.calls).toEqual([[1]]);
  });

  it("exits 1 when the HTTP server fails to close", async () => {
    const h = createHarness();

    const done = h.shutdown({ reason: "SIGTERM" });
    h.finishHttpClose(new Error("close failed"));
    await done;

    expect(h.closeDatabase).toHaveBeenCalledOnce();
    expect(h.exit.mock.calls).toEqual([[1]]);
  });

  it("exits 1 when closing the database throws", async () => {
    const h = createHarness({
      closeDatabase: () => {
        throw new Error("db close failed");
      },
    });

    const done = h.shutdown({ reason: "SIGTERM" });
    h.finishHttpClose();
    await done;

    expect(h.exit.mock.calls).toEqual([[1]]);
  });
});
