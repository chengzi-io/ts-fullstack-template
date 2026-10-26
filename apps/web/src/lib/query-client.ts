import { MutationCache, QueryClient } from "@tanstack/react-query";

/**
 * Every successful mutation invalidates every query: active ones refetch
 * before the mutation resolves, the rest refetch when next used. Features
 * therefore never coordinate cache keys (renaming an author refreshes the
 * posts that embed the name). Shared with the tRPC options proxy.
 */
export const queryClient: QueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
  mutationCache: new MutationCache({
    onSuccess: () => queryClient.invalidateQueries(),
  }),
});
