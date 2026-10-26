import { useMutation, useQuery } from "@tanstack/react-query";

import { trpc } from "@/lib/trpc.ts";

import { authorByIdQueryOptions, authorsListQueryOptions } from "./api.ts";

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

// Cache refresh after success is global — see `lib/query-client.ts`.
export function useCreateAuthorMutation() {
  return useMutation(trpc.authors.create.mutationOptions());
}

export function useUpdateAuthorMutation() {
  return useMutation(trpc.authors.update.mutationOptions());
}

export function useDeleteAuthorMutation() {
  return useMutation(trpc.authors.delete.mutationOptions());
}
