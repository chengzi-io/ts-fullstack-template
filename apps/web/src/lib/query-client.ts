import { QueryClient } from "@tanstack/react-query";

/** Shared with tRPC options proxy so invalidations hit the same cache. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
});
