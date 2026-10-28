import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const positiveInt = z.coerce.number().int().positive();

export const env = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
  server: {
    CORS_ORIGIN: z.string().min(1).optional(),
    DATABASE_AUTH_TOKEN: z.string().min(1).optional(),
    /** Set only when exactly one instance will ever run (see below). */
    DATABASE_SINGLE_INSTANCE: z.stringbool().default(false),
    DATABASE_URL: z
      .string()
      .min(1)
      .refine(
        (value) =>
          value.startsWith("file:") ||
          value.startsWith("libsql:") ||
          value.startsWith("http:") ||
          value.startsWith("https:"),
        { message: "must be a file:, libsql:, http:, or https: database URL" }
      ),
    HTTP_HEADERS_TIMEOUT_MS: positiveInt.default(10_000),
    HTTP_KEEP_ALIVE_TIMEOUT_MS: positiveInt.default(5000),
    HTTP_REQUEST_TIMEOUT_MS: positiveInt.default(30_000),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace"])
      .default("info"),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    /** The only OTel gate we declare; the SDK reads its other OTEL_* vars. */
    OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    /** Not-ready grace before closing HTTP; set to the LB's deregistration delay. */
    SHUTDOWN_DRAIN_MS: z.coerce.number().int().min(0).default(0),
    SHUTDOWN_TIMEOUT_MS: positiveInt.default(10_000),
  },
});

// A `file:` database lives on one machine: with two replicas, each would
// write its own copy and the data would silently split.
if (
  env.NODE_ENV === "production" &&
  env.DATABASE_URL.startsWith("file:") &&
  !env.DATABASE_SINGLE_INSTANCE
) {
  throw new Error(
    "DATABASE_URL is a local file in production. Use a shared libsql:/https: " +
      "database, or set DATABASE_SINGLE_INSTANCE=true if only one instance ever runs."
  );
}

// The forced-exit timer starts with shutdown, so it must outlast the drain.
if (env.SHUTDOWN_DRAIN_MS >= env.SHUTDOWN_TIMEOUT_MS) {
  throw new Error(
    "SHUTDOWN_DRAIN_MS must be lower than SHUTDOWN_TIMEOUT_MS, or the forced exit fires before HTTP even closes."
  );
}
