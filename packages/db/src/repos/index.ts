import type { AppRepos } from "@workspace/domain";

import type { Database } from "../index.js";
import { createAuthorsRepo } from "./authors.js";
import { createPostsRepo } from "./posts.js";

/** `ctx.repos` for one `Database` instance. */
export function createRepos(db: Database): AppRepos {
  return {
    authors: createAuthorsRepo(db),
    posts: createPostsRepo(db),
  };
}
