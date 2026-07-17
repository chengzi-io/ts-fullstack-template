import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@workspace/api";
import superjson from "superjson";
import { env } from "@/env.ts";
import { queryClient } from "@/lib/query-client.ts";

/**
 * Typed tRPC HTTP client.
 * Contract: AppRouter from @workspace/api (types only — no server runtime).
 * Transformer must match packages/api (superjson).
 */
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      transformer: superjson,
      url: env.VITE_TRPC_URL,
    }),
  ],
});

/**
 * Query/mutation option factory for TanStack Query.
 * Prefer feature hooks over importing this in routes.
 */
export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});
