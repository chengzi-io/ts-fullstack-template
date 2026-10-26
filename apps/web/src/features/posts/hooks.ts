import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { authorsListQueryOptions } from "@/features/authors/api.ts";
import { trpc } from "@/lib/trpc.ts";

import {
  type PostsListInput,
  postByIdQueryOptions,
  postsListQueryOptions,
} from "./api.ts";

/** Keeps the current page on screen while the next one loads. */
export function usePostsQuery(input: PostsListInput) {
  return useQuery({
    ...postsListQueryOptions(input),
    placeholderData: keepPreviousData,
  });
}

export function usePostQuery(
  id: number | null,
  options?: { enabled?: boolean }
) {
  const open = id !== null && id > 0;
  return useQuery({
    ...postByIdQueryOptions(id ?? 0),
    enabled: (options?.enabled ?? true) && open,
  });
}

/**
 * Authors matching the picker's search (first page) — read through the
 * authors feature's api.ts.
 */
export function useAuthorOptionsQuery(
  q: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    ...authorsListQueryOptions({ q: q || undefined }),
    enabled: options?.enabled,
    placeholderData: keepPreviousData,
  });
}

// Cache refresh after success is global — see `lib/query-client.ts`.
export function useCreatePostMutation() {
  return useMutation(trpc.posts.create.mutationOptions());
}

export function useUpdatePostMutation() {
  return useMutation(trpc.posts.update.mutationOptions());
}

export function useDeletePostMutation() {
  return useMutation(trpc.posts.delete.mutationOptions());
}
