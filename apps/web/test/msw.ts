import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import superjson, { type SuperJSONResult } from "superjson";

/** One MSW server per test run; each test adds handlers with `server.use()`. */
export const server = setupServer();

type Resolver = (input: unknown) => unknown;

/**
 * Answers `httpBatchLink` calls with plain resolvers keyed by procedure path
 * (`"authors.list"`), speaking the same superjson wire format as the API.
 */
export function trpc(resolvers: Record<string, Resolver>) {
  return http.all("*/trpc/:paths", async ({ params, request }) => {
    const inputs = await readBatchInputs(request);
    const results = String(params.paths)
      .split(",")
      .map((path, index) => {
        const resolve = resolvers[path];
        if (!resolve) {
          throw new Error(`No test resolver for tRPC procedure "${path}"`);
        }
        const raw = inputs[String(index)];
        const input =
          raw === undefined ? undefined : superjson.deserialize(raw);
        return { result: { data: superjson.serialize(resolve(input)) } };
      });
    return HttpResponse.json(results);
  });
}

async function readBatchInputs(
  request: Request
): Promise<Record<string, SuperJSONResult>> {
  if (request.method === "GET") {
    const raw = new URL(request.url).searchParams.get("input");
    return raw ? JSON.parse(raw) : {};
  }
  return await request.json();
}
