import { listPostsInput } from "@workspace/domain/posts";

import { trpc } from "@/lib/trpc.ts";

/**
 * React-free query options for the posts feature. Mutations need no
 * invalidation here: see `lib/query-client.ts`.
 */

export const defaultPostsListInput = listPostsInput.parse({});

export function postsListQueryOptions() {
  return trpc.posts.list.queryOptions(defaultPostsListInput);
}

export function postByIdQueryOptions(id: number) {
  return trpc.posts.byId.queryOptions({ id });
}
