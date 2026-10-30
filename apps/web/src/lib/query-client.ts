import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { isExpectedError, reportError } from "@/lib/report-error.ts";

/**
 * Every successful mutation invalidates every query: active ones refetch
 * before the mutation resolves, the rest refetch when next used. Features
 * therefore never coordinate cache keys (renaming an author refreshes the
 * posts that embed the name). Shared with the tRPC options proxy.
 *
 * Every unexpected failure is reported once through `lib/report-error.ts`,
 * tagged with the key that failed. Failures the API marks expected are left
 * to the feature that shows them inline.
 */
export const queryClient: QueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
  mutationCache: new MutationCache({
    onError: (error, _variables, _onMutateResult, mutation) => {
      if (isExpectedError(error)) {
        return;
      }
      reportError(error, {
        key: mutation.options.mutationKey,
        scope: "mutation",
      });
    },
    onSuccess: () => queryClient.invalidateQueries(),
  }),
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (isExpectedError(error)) {
        return;
      }
      reportError(error, { key: query.queryKey, scope: "query" });
    },
  }),
});
