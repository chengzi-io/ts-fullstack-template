import { afterEach, describe, expect, it, vi } from "vitest";

const INVALID_ENV = /invalid environment variables/i;

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
  it("fails fast without DATABASE_URL", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(loadEnv({ DATABASE_URL: undefined })).rejects.toThrow(
      INVALID_ENV
    );
  });

  it("rejects database URLs the libSQL client cannot open", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      loadEnv({ DATABASE_URL: "postgres://localhost/app" })
    ).rejects.toThrow(INVALID_ENV);
  });

  it("accepts a remote libSQL URL and applies defaults", async () => {
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
