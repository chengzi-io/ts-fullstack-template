import type { RouterInputs } from "@workspace/api";

import { trpc } from "@/lib/trpc.ts";

/**
 * React-free query options for the posts feature. Mutations need no
 * invalidation here: see `lib/query-client.ts`.
 */

export type PostsListInput = RouterInputs["posts"]["list"];

export function postsListQueryOptions(input: PostsListInput) {
  return trpc.posts.list.queryOptions(input);
}

export function postByIdQueryOptions(id: number) {
  return trpc.posts.byId.queryOptions({ id });
}
