import { loadEnv, port, str } from "./lib/load-env.js";

/**
 * Host process env (envalid-style). Keys match process.env.
 * Add fields with `str` / `port` / `num` / `bool` as needed.
 */
export const env = loadEnv(
  {
    CORS_ORIGIN: str({ optional: true }),
    /** Runtime DB URL; default = packages/db local SQLite (cwd: apps/server). */
    DB_FILE_NAME: str({ default: "file:../../packages/db/local.db" }),
    LOG_LEVEL: str({ default: "info" }),
    NODE_ENV: str({ default: "development" }),
    PORT: port({ default: 3000 }),
  },
  { hint: "See apps/server/.env.example" }
);

export type Env = typeof env;
