import { trace } from "@opentelemetry/api";
import pino, { type DestinationStream } from "pino";

export type { Logger } from "pino";

export interface CreateLoggerOptions {
  /** Test seam: pino writes to stdout unless a destination is injected. */
  destination?: DestinationStream;
  level: string;
  nodeEnv: string;
}

const SECRET_KEYS = ["authorization", "cookie", "password", "token"];

const REDACT_PATHS = [
  ...SECRET_KEYS,
  ...SECRET_KEYS.map((key) => `*.${key}`),
  "req.headers.authorization",
  "req.headers.cookie",
];

export function createLogger(options: CreateLoggerOptions) {
  const isDev = options.nodeEnv === "development";

  return pino(
    {
      level: options.level,
      // The API returns a fresh object per call; `{}` when no span is active.
      mixin() {
        const spanContext = trace.getActiveSpan()?.spanContext();
        if (!spanContext) {
          return {};
        }
        return {
          span_id: spanContext.spanId,
          trace_flags: spanContext.traceFlags,
          trace_id: spanContext.traceId,
        };
      },
      redact: { censor: "[redacted]", paths: REDACT_PATHS },
      ...(isDev
        ? {
            transport: {
              options: { colorize: true },
              target: "pino-pretty",
            },
          }
        : {}),
    },
    options.destination
  );
}
