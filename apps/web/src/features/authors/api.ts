import type { RouterInputs } from "@workspace/api";

import { trpc } from "@/lib/trpc.ts";

/**
 * React-free query options for the authors feature — the surface other
 * features may import (e.g. posts lists authors for its picker). Mutations
 * need no invalidation here: see `lib/query-client.ts`.
 */

export type AuthorsListInput = RouterInputs["authors"]["list"];

export function authorsListQueryOptions(input: AuthorsListInput) {
  return trpc.authors.list.queryOptions(input);
}

export function authorByIdQueryOptions(id: number) {
  return trpc.authors.byId.queryOptions({ id });
}
