import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { trpc } from "@/lib/trpc.ts";

import {
  invalidatePosts,
  postByIdQueryKey,
  postByIdQueryOptions,
  postsListQueryOptions,
} from "./api.ts";

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

export function useCreatePostMutation() {
  const queryClient = useQueryClient();
  return useMutation(
    trpc.posts.create.mutationOptions({
      onSuccess: async () => {
        await invalidatePosts(queryClient);
      },
    })
  );
}

export function useUpdatePostMutation() {
  const queryClient = useQueryClient();
  return useMutation(
    trpc.posts.update.mutationOptions({
      onSuccess: async (post) => {
        queryClient.setQueryData(postByIdQueryKey(post.id), post);
        await invalidatePosts(queryClient, post.id);
      },
    })
  );
}

export function useDeletePostMutation() {
  const queryClient = useQueryClient();
  return useMutation(
    trpc.posts.delete.mutationOptions({
      onSuccess: async (_data, input) => {
        queryClient.removeQueries({ queryKey: postByIdQueryKey(input.id) });
        await invalidatePosts(queryClient);
      },
    })
  );
}
