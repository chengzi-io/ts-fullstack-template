import type { QueryClient } from "@tanstack/react-query";
import { listPostsInput } from "@workspace/domain/posts";

import { trpc } from "@/lib/trpc.ts";

/**
 * React-free cache layer for the posts feature.
 *
 * `postsListQueryFilter` is the public seam other features invalidate through
 * (authors touch the posts list because the author name is denormalized there).
 */

export const postsListQueryFilter = {
  queryKey: trpc.posts.list.queryKey(),
};

export const defaultPostsListInput = listPostsInput.parse({});

export function postsListQueryOptions() {
  return trpc.posts.list.queryOptions(defaultPostsListInput);
}

export function postByIdQueryOptions(id: number) {
  return trpc.posts.byId.queryOptions({ id });
}

export function postByIdQueryKey(id: number) {
  return trpc.posts.byId.queryKey({ id });
}

export async function invalidatePosts(
  queryClient: QueryClient,
  postId?: number
) {
  await queryClient.invalidateQueries(postsListQueryFilter);
  if (postId !== undefined) {
    await queryClient.invalidateQueries({ queryKey: postByIdQueryKey(postId) });
  }
}
