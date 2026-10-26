import { useMutation, useQuery } from "@tanstack/react-query";
import { authorsListQueryOptions } from "@/features/authors/api.ts";
import { trpc } from "@/lib/trpc.ts";

import { postByIdQueryOptions, postsListQueryOptions } from "./api.ts";

export function usePostsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    ...postsListQueryOptions(),
    enabled: options?.enabled,
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

/** Authors for the post form's picker — read through the authors feature's api.ts. */
export function useAuthorOptionsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    ...authorsListQueryOptions(),
    enabled: options?.enabled,
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
