import { useMutation, useQuery } from "@tanstack/react-query";

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
