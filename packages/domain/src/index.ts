import type { AuthorsRepo } from "./authors.js";
import type { PostsRepo } from "./posts.js";

/** Host injects this as `ctx.repos`. Demo keys — drop with the scaffold. */
export interface AppRepos {
  authors: AuthorsRepo;
  posts: PostsRepo;
}

export type {
  Author,
  AuthorSummary,
  AuthorsRepo,
  CreateAuthorInput,
  ListAuthorsInput,
  ListAuthorsResult,
  UpdateAuthorInput,
  UpdateAuthorPatch,
} from "./authors.js";

export type {
  CreatePostInput,
  ListPostsInput,
  ListPostsResult,
  Post,
  PostsRepo,
  UpdatePostInput,
  UpdatePostPatch,
} from "./posts.js";
