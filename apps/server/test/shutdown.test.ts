import { describe, expect, it, vi } from "vitest";

import { createShutdown } from "../src/lib/shutdown.js";

const TIMEOUT_MS = 1000;
const DRAIN_MS = 200;

/** Drives shutdown by hand: no real timers, sockets, or process.exit. */
function createHarness(
  options: {
    closeDatabase?: () => void;
    closeTracing?: () => Promise<void>;
    drainMs?: number;
    exit?: (code: number) => void;
  } = {}
) {
  let finishHttpClose: (error?: Error) => void = () => undefined;
  const timers = new Map<number, () => void>();

  const server = {
    close: vi.fn((callback: (error?: Error) => void) => {
      finishHttpClose = callback;
    }),
    closeAllConnections: vi.fn(),
  };
  const closeDatabase = vi.fn(options.closeDatabase ?? (() => undefined));
  const closeTracing = options.closeTracing
    ? vi.fn(options.closeTracing)
    : undefined;
  const exit = vi.fn((code: number) => options.exit?.(code));
  const onDrainStart = vi.fn();

  const shutdown = createShutdown({
    clearTimeout: () => undefined,
    closeDatabase,
    closeTracing,
    drainMs: options.drainMs ?? 0,
    exit,
    log: { error: () => undefined, info: () => undefined },
    onDrainStart,
    server,
    setTimeout: (callback, milliseconds) => {
      timers.set(milliseconds, callback);
      return {};
    },
    timeoutMs: TIMEOUT_MS,
  });

  return {
    closeDatabase,
    closeTracing,
    exit,
    finishHttpClose: (error?: Error) => finishHttpClose(error),
    fireTimer: (milliseconds: number) => timers.get(milliseconds)?.(),
    onDrainStart,
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
    h.fireTimer(TIMEOUT_MS);
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

  it("closes tracing after the database and before exit", async () => {
    const order: string[] = [];
    const h = createHarness({
      closeDatabase: () => order.push("database"),
      closeTracing: () => {
        order.push("tracing");
        return Promise.resolve();
      },
      exit: (code) => order.push(`exit:${code}`),
    });

    const done = h.shutdown({ reason: "SIGTERM" });
    h.finishHttpClose();
    await done;

    expect(order).toEqual(["database", "tracing", "exit:0"]);
  });

  it("exits 1 when closing tracing fails", async () => {
    const h = createHarness({
      closeTracing: () => Promise.reject(new Error("flush failed")),
    });

    const done = h.shutdown({ reason: "SIGTERM" });
    h.finishHttpClose();
    await done;

    expect(h.closeTracing).toHaveBeenCalledOnce();
    expect(h.exit.mock.calls).toEqual([[1]]);
  });

  it("force-exits while tracing shutdown hangs", async () => {
    const h = createHarness({
      closeTracing: () => new Promise<void>(() => undefined),
    });

    const done = h.shutdown({ reason: "SIGTERM" });
    h.finishHttpClose();
    h.fireTimer(TIMEOUT_MS);
    await done;

    expect(h.exit.mock.calls).toEqual([[1]]);
  });

  it("reports not ready, drains, and only then closes HTTP", async () => {
    const h = createHarness({ drainMs: DRAIN_MS });

    const done = h.shutdown({ reason: "SIGTERM" });
    expect(h.onDrainStart).toHaveBeenCalledOnce();
    expect(h.server.close).not.toHaveBeenCalled();

    h.fireTimer(DRAIN_MS);
    expect(h.server.close).toHaveBeenCalledOnce();

    h.finishHttpClose();
    await done;
    expect(h.exit.mock.calls).toEqual([[0]]);
  });
});
