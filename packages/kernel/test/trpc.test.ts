import { afterEach, beforeEach, describe, expect, test } from "vitest";

import type { Logger } from "../src/context.js";
import {
  ConflictError,
  InvalidReferenceError,
  NotFoundError,
} from "../src/errors.js";
import { createTestContext } from "../src/testing.js";
import {
  createCallerFactory,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../src/trpc.js";

/** A procedure per failure kind — no demo module involved. */
const router = createTRPCRouter({
  conflict: publicProcedure.query(() => {
    throw new ConflictError("Thing is still in use");
  }),
  crash: publicProcedure.query(() => {
    const driverError = Object.assign(
      new Error("SQLITE_BUSY: database is locked"),
      { code: "SQLITE_BUSY" }
    );
    throw new Error("Failed query: select secret from t\nparams: 42", {
      cause: driverError,
    });
  }),
  invalidReference: publicProcedure.query(() => {
    throw new InvalidReferenceError("Owner not found");
  }),
  missing: publicProcedure.query(() => {
    throw new NotFoundError("Thing not found");
  }),
  // Compiles only because protectedProcedure narrows `session.user`.
  secret: protectedProcedure.query(({ ctx }) => ctx.session.user.id),
});
const createCaller = createCallerFactory(router);

interface LogEntry {
  data: Record<string, unknown>;
  level: keyof Logger;
  message?: string;
}

/** Sink for every level, so a test can assert on what a procedure logged. */
function recordingLogger(sink: LogEntry[]): Logger {
  const record = (level: keyof Logger) => (data: object, message?: string) => {
    sink.push({ data: data as Record<string, unknown>, level, message });
  };

  return {
    debug: record("debug"),
    error: record("error"),
    info: record("info"),
    warn: record("warn"),
  };
}

let entries: LogEntry[];
let caller: ReturnType<typeof createCaller>;
let disposals: (() => Promise<void>)[];

beforeEach(async () => {
  entries = [];
  disposals = [];
  const context = await createTestContext({ log: recordingLogger(entries) });
  caller = createCaller(context.ctx);
  disposals.push(context.dispose);
});

afterEach(async () => {
  await Promise.all(disposals.map((dispose) => dispose()));
});

describe("domain errors", () => {
  test("map to tRPC codes and keep their message", async () => {
    await expect(caller.missing()).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Thing not found",
    });
    await expect(caller.conflict()).rejects.toMatchObject({
      code: "CONFLICT",
    });
    await expect(caller.invalidReference()).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  test("are logged as warnings with the mapped code", async () => {
    await expect(caller.missing()).rejects.toThrow("Thing not found");

    expect(entries).toMatchObject([
      {
        data: { code: "NOT_FOUND", path: "missing" },
        level: "warn",
        message: "procedure failed",
      },
    ]);
  });
});

describe("protected procedure", () => {
  test("rejects without a session and logs a warning", async () => {
    // The beforeEach context leaves `session` null, as the template host does.
    await expect(caller.secret()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });

    expect(entries).toMatchObject([
      {
        data: { code: "UNAUTHORIZED", path: "secret" },
        level: "warn",
        message: "procedure failed",
      },
    ]);
  });

  test("returns the session user and logs the success", async () => {
    const context = await createTestContext({
      log: recordingLogger(entries),
      session: { user: { id: "user-1" } },
    });
    disposals.push(context.dispose);
    const authed = createCaller(context.ctx);

    await expect(authed.secret()).resolves.toBe("user-1");

    expect(entries).toMatchObject([
      {
        data: { path: "secret", status: "ok", type: "query" },
        level: "info",
        message: "procedure",
      },
    ]);
  });
});

test("logs the driver-level cause of internal errors, without SQL", async () => {
  await expect(caller.crash()).rejects.toMatchObject({
    code: "INTERNAL_SERVER_ERROR",
  });

  expect(entries).toMatchObject([
    {
      data: {
        err: {
          code: "SQLITE_BUSY",
          message: expect.not.stringContaining("Failed query"),
        },
        path: "crash",
      },
      level: "error",
      message: "procedure failed",
    },
  ]);
});
