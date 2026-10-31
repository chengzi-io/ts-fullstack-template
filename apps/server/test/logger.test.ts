import { describe, expect, test } from "vitest";

import { createLogger } from "../src/lib/logger.js";

function createCapturingLogger() {
  const lines: string[] = [];
  const log = createLogger({
    destination: {
      write: (line: string) => {
        lines.push(line);
      },
    },
    level: "info",
    nodeEnv: "test",
  });
  return { lines, log };
}

describe("logger", () => {
  test("redacts secrets at the top level and one level deep", () => {
    const { lines, log } = createCapturingLogger();

    log.info(
      {
        authorization: "Bearer top-secret",
        cookie: "session=top-secret",
        name: "visible",
        password: "top-secret",
        token: "top-secret",
        user: {
          authorization: "Bearer top-secret",
          name: "Ada",
          password: "top-secret",
          token: "top-secret",
        },
      },
      "credentials"
    );

    expect(JSON.parse(lines[0] ?? "{}")).toMatchObject({
      authorization: "[redacted]",
      cookie: "[redacted]",
      name: "visible",
      password: "[redacted]",
      token: "[redacted]",
      user: {
        authorization: "[redacted]",
        name: "Ada",
        password: "[redacted]",
        token: "[redacted]",
      },
    });
  });

  test("redacts request headers that carry credentials", () => {
    const { lines, log } = createCapturingLogger();

    log.info(
      {
        req: {
          headers: {
            authorization: "Bearer top-secret",
            cookie: "session=top-secret",
            "user-agent": "vitest",
          },
        },
      },
      "request"
    );

    expect(JSON.parse(lines[0] ?? "{}")).toMatchObject({
      req: {
        headers: {
          authorization: "[redacted]",
          cookie: "[redacted]",
          "user-agent": "vitest",
        },
      },
    });
  });
});
