import { listAuthorsInput } from "@workspace/domain/authors";

import { trpc } from "@/lib/trpc.ts";

/**
 * React-free query options for the authors feature — the surface other
 * features may import (e.g. posts lists authors for its picker). Mutations
 * need no invalidation here: see `lib/query-client.ts`.
 */

export const defaultAuthorsListInput = listAuthorsInput.parse({});

export function authorsListQueryOptions() {
  return trpc.authors.list.queryOptions(defaultAuthorsListInput);
}

export function authorByIdQueryOptions(id: number) {
  return trpc.authors.byId.queryOptions({ id });
}
