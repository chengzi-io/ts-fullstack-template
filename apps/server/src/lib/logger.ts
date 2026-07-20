import pino from "pino";

export type { Logger } from "pino";

export interface CreateLoggerOptions {
  level: string;
  nodeEnv: string;
}

export function createLogger(options: CreateLoggerOptions) {
  const isDev = options.nodeEnv === "development";

  return pino({
    level: options.level,
    ...(isDev
      ? {
          transport: {
            options: { colorize: true },
            target: "pino-pretty",
          },
        }
      : {}),
  });
}
