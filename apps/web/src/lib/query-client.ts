import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { reportError } from "@/lib/report-error.ts";

/**
 * Every successful mutation invalidates every query: active ones refetch
 * before the mutation resolves, the rest refetch when next used. Features
 * therefore never coordinate cache keys (renaming an author refreshes the
 * posts that embed the name). Shared with the tRPC options proxy.
 *
 * Every failure is reported once through `lib/report-error.ts`, tagged with
 * the key that failed.
 */
export const queryClient: QueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
  mutationCache: new MutationCache({
    onError: (error, _variables, _onMutateResult, mutation) => {
      reportError(error, {
        key: mutation.options.mutationKey,
        scope: "mutation",
      });
    },
    onSuccess: () => queryClient.invalidateQueries(),
  }),
  queryCache: new QueryCache({
    onError: (error, query) => {
      reportError(error, { key: query.queryKey, scope: "query" });
    },
  }),
});
