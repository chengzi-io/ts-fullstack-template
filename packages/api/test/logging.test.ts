import { expect, it } from "vitest";

import type { Logger } from "../src/context.js";
import { createTestCaller } from "./caller.js";

interface LogEntry {
  data: Record<string, unknown>;
  level: keyof Logger;
  message?: string;
}

function createRecordingLogger() {
  const entries: LogEntry[] = [];
  const record = (level: keyof Logger) => (data: object, message?: string) => {
    entries.push({ data: data as Record<string, unknown>, level, message });
  };
  const log: Logger = {
    debug: record("debug"),
    error: record("error"),
    info: record("info"),
    warn: record("warn"),
  };
  return { entries, log };
}

it("logs the driver-level cause of internal errors, without SQL", async () => {
  const { entries, log } = createRecordingLogger();
  const { caller, db, dispose } = await createTestCaller({ log });
  db.close();

  await expect(caller.authors.list()).rejects.toMatchObject({
    code: "INTERNAL_SERVER_ERROR",
  });
  await dispose();

  const failure = entries.find((entry) => entry.message === "procedure failed");
  expect(failure).toMatchObject({
    data: {
      err: {
        code: "CLIENT_CLOSED",
        message: expect.not.stringContaining("Failed query"),
      },
      path: "authors.list",
    },
    level: "error",
  });
});
