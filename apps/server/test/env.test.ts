import { afterEach, describe, expect, test, vi } from "vitest";

const INVALID_ENV = /invalid environment variables/iu;
const NEEDS_SINGLE_INSTANCE = /DATABASE_SINGLE_INSTANCE/u;
const DRAIN_TOO_LONG = /SHUTDOWN_DRAIN_MS/u;

/** `env.ts` validates `process.env` at import, so each case re-imports it. */
async function loadEnv(vars: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [name, value] of Object.entries(vars)) {
    vi.stubEnv(name, value);
  }
  const { env } = await import("../src/env.js");
  return env;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("env", () => {
  test("fails fast without DATABASE_URL", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(loadEnv({ DATABASE_URL: undefined })).rejects.toThrow(
      INVALID_ENV
    );
  });

  test("rejects database URLs the libSQL client cannot open", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      loadEnv({ DATABASE_URL: "postgres://localhost/app" })
    ).rejects.toThrow(INVALID_ENV);
  });

  test("refuses a local file database in production", async () => {
    await expect(
      loadEnv({
        DATABASE_SINGLE_INSTANCE: undefined,
        DATABASE_URL: "file:/var/data/app.db",
        NODE_ENV: "production",
      })
    ).rejects.toThrow(NEEDS_SINGLE_INSTANCE);
  });

  test("allows a file database in production for a declared single instance", async () => {
    const env = await loadEnv({
      DATABASE_SINGLE_INSTANCE: "true",
      DATABASE_URL: "file:/var/data/app.db",
      NODE_ENV: "production",
    });

    expect(env.DATABASE_SINGLE_INSTANCE).toBe(true);
  });

  test("refuses a drain that outlasts the shutdown timeout", async () => {
    await expect(
      loadEnv({
        DATABASE_URL: "libsql://app.example.turso.io",
        SHUTDOWN_DRAIN_MS: "10000",
        SHUTDOWN_TIMEOUT_MS: "10000",
      })
    ).rejects.toThrow(DRAIN_TOO_LONG);
  });

  test("accepts a remote libSQL URL and applies defaults", async () => {
    const env = await loadEnv({
      DATABASE_URL: "libsql://app.example.turso.io",
      LOG_LEVEL: undefined,
      PORT: undefined,
    });

    expect(env).toMatchObject({
      DATABASE_URL: "libsql://app.example.turso.io",
      LOG_LEVEL: "info",
      PORT: 3000,
    });
  });
});
