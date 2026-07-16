import { createDb } from "@workspace/db";

import { env } from "./env.js";

/** Process-scoped DB for this host. Schema & migrations live in `@workspace/db`. */
export const db = createDb(env.DB_FILE_NAME);
