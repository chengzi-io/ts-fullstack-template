import type { QueryClient } from "@tanstack/react-query";
import { listAuthorsInput } from "@workspace/domain/authors";

import { postsListQueryFilter } from "@/features/posts/api.ts";
import { trpc } from "@/lib/trpc.ts";

/**
 * React-free cache layer for the authors feature.
 *
 * Query option factories, the shared list filter, and invalidation strategy
 * live here so they are unit-testable and reusable by other features' `api.ts`
 * (the one legal cross-feature link). `hooks.ts` is only a thin React wrapper.
 */

export const authorsListQueryFilter = {
  queryKey: trpc.authors.list.queryKey(),
};

export const defaultAuthorsListInput = listAuthorsInput.parse({});

export function authorsListQueryOptions() {
  return trpc.authors.list.queryOptions(defaultAuthorsListInput);
}

export function authorByIdQueryOptions(id: number) {
  return trpc.authors.byId.queryOptions({ id });
}

export function authorByIdQueryKey(id: number) {
  return trpc.authors.byId.queryKey({ id });
}

/** Authors' names appear on the posts list, so invalidate both. */
export async function invalidateAuthors(
  queryClient: QueryClient,
  authorId?: number
) {
  await Promise.all([
    queryClient.invalidateQueries(authorsListQueryFilter),
    queryClient.invalidateQueries(postsListQueryFilter),
  ]);
  if (authorId !== undefined) {
    await queryClient.invalidateQueries({
      queryKey: authorByIdQueryKey(authorId),
    });
  }
}
