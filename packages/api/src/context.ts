import type { AppRepos } from "@workspace/domain";

/** Host injects logger (e.g. pino); no pino dependency here. */
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
 * Inject deps only — no env, no raw `db`.
 * Data access is `repos` (`AppRepos`).
 */
export function createTRPCContext(opts: {
  log: Logger;
  repos: AppRepos;
  requestId: string;
  session?: Session | null;
}) {
  return {
    log: opts.log,
    repos: opts.repos,
    requestId: opts.requestId,
    session: opts.session ?? null,
  };
}

export type Context = ReturnType<typeof createTRPCContext>;
