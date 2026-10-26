import type { Database } from "@workspace/db";

/**
 * Host injects a request-scoped logger (e.g. a pino child bound to the request
 * id); no pino dependency here.
 */
export interface Logger {
  debug: (obj: object, msg?: string) => void;
  error: (obj: object, msg?: string) => void;
  info: (obj: object, msg?: string) => void;
  warn: (obj: object, msg?: string) => void;
}

/** Filled by host when auth exists; template leaves unset. */
export interface Session {
  user: {
    id: string;
  };
}

/**
 * Injected deps only — no env. Each module's procedure middleware builds its
 * own repo from `db`; routers never query `db` directly.
 */
export function createTRPCContext(opts: {
  db: Database;
  log: Logger;
  requestId: string;
  session?: Session | null;
}) {
  return {
    db: opts.db,
    log: opts.log,
    requestId: opts.requestId,
    session: opts.session ?? null,
  };
}

export type Context = ReturnType<typeof createTRPCContext>;
