import { expect, it } from "vitest";

import { queryClient } from "@/lib/query-client.ts";

// Features rely on this instead of invalidating each other's keys.
it("invalidates every cached query after any successful mutation", async () => {
  queryClient.setQueryData([["posts", "list"]], { items: [] });
  queryClient.setQueryData([["authors", "byId"], { id: 1 }], { id: 1 });

  await queryClient
    .getMutationCache()
    .build(queryClient, { mutationFn: () => Promise.resolve("ok") })
    .execute(undefined);

  for (const query of queryClient.getQueryCache().getAll()) {
    expect(query.state.isInvalidated).toBe(true);
  }
});
