import type { Database } from "@workspace/db";

/**
 * Minimal logger surface for procedures (structural — host injects pino, etc.).
 * Avoid depending on a concrete logger package from `@workspace/api`.
 */
export interface AppLogger {
  debug: (obj: object, msg?: string) => void;
  error: (obj: object, msg?: string) => void;
  info: (obj: object, msg?: string) => void;
  warn: (obj: object, msg?: string) => void;
}

/** Request-scoped dependencies injected by the HTTP host (`apps/server`). */
export interface Context {
  db: Database;
  log: AppLogger;
  requestId: string;
}

export interface CreateContextOptions {
  db: Database;
  log: AppLogger;
  requestId: string;
}

export function createContext(opts: CreateContextOptions): Context {
  return {
    db: opts.db,
    log: opts.log,
    requestId: opts.requestId,
  };
}
