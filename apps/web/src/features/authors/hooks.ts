import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { trpc } from "@/lib/trpc.ts";

import {
  authorByIdQueryKey,
  authorByIdQueryOptions,
  authorsListQueryOptions,
  invalidateAuthors,
} from "./api.ts";

export function useAuthorsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    ...authorsListQueryOptions(),
    enabled: options?.enabled,
  });
}

export function useAuthorQuery(
  id: number | null,
  options?: { enabled?: boolean }
) {
  const open = id !== null && id > 0;
  return useQuery({
    ...authorByIdQueryOptions(id ?? 0),
    enabled: (options?.enabled ?? true) && open,
  });
}

export function useCreateAuthorMutation() {
  const queryClient = useQueryClient();
  return useMutation(
    trpc.authors.create.mutationOptions({
      onSuccess: async () => {
        await invalidateAuthors(queryClient);
      },
    })
  );
}

export function useUpdateAuthorMutation() {
  const queryClient = useQueryClient();
  return useMutation(
    trpc.authors.update.mutationOptions({
      onSuccess: async (author) => {
        queryClient.setQueryData(authorByIdQueryKey(author.id), author);
        await invalidateAuthors(queryClient, author.id);
      },
    })
  );
}

export function useDeleteAuthorMutation() {
  const queryClient = useQueryClient();
  return useMutation(
    trpc.authors.delete.mutationOptions({
      onSuccess: async (_data, input) => {
        queryClient.removeQueries({ queryKey: authorByIdQueryKey(input.id) });
        await invalidateAuthors(queryClient);
      },
    })
  );
}
