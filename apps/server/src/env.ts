import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const positiveInt = z.coerce.number().int().positive();

export const env = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
  server: {
    CORS_ORIGIN: z.string().min(1).optional(),
    DATABASE_AUTH_TOKEN: z.string().min(1).optional(),
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
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    SHUTDOWN_TIMEOUT_MS: positiveInt.default(10_000),
  },
});
