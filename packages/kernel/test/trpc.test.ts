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
});
const createCaller = createCallerFactory(router);

interface LogEntry {
  data: Record<string, unknown>;
  level: keyof Logger;
  message?: string;
}

let entries: LogEntry[];
let caller: ReturnType<typeof createCaller>;
let dispose: () => Promise<void>;

beforeEach(async () => {
  entries = [];
  const record = (level: keyof Logger) => (data: object, message?: string) => {
    entries.push({ data: data as Record<string, unknown>, level, message });
  };
  const context = await createTestContext({
    log: {
      debug: record("debug"),
      error: record("error"),
      info: record("info"),
      warn: record("warn"),
    },
  });
  caller = createCaller(context.ctx);
  ({ dispose } = context);
});

afterEach(async () => {
  await dispose();
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
    await expect(caller.missing()).rejects.toThrow();

    expect(entries).toMatchObject([
      {
        data: { code: "NOT_FOUND", path: "missing" },
        level: "warn",
        message: "procedure failed",
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
