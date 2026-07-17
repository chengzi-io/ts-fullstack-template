import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/lib/trpc.ts";

/** Stable key root for todos list invalidation (mutations in later steps). */
export const todosListQueryKey = trpc.todos.list.queryKey();

/**
 * List todos from the real tRPC API (paginated).
 * Default page matches API pagination defaults.
 */
export function useTodosQuery() {
  return useQuery(
    trpc.todos.list.queryOptions({
      page: 1,
      pageSize: 20,
    })
  );
}
