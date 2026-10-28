import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import superjson, { type SuperJSONResult } from "superjson";

/** One MSW server per test run; each test adds handlers with `server.use()`. */
export const server = setupServer();

type Resolver = (input: unknown) => unknown;

/**
 * A failure a resolver throws to answer like the API does: `trpc()` replies
 * with `{ error: { json: { message, data: { code } } } }` and an error HTTP
 * status, which the client raises as a `TRPCClientError` carrying the code and
 * the message a real server would send. `data` adds what the API's error
 * formatter puts on every error — e.g. `requestId`.
 */
export class TrpcError extends Error {
  readonly code: string;
  readonly data: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    data: Record<string, unknown> = {}
  ) {
    super(message);
    this.code = code;
    this.data = data;
    this.name = "TrpcError";
  }
}

const TRPC_ERROR_HTTP_STATUS: Record<string, number> = {
  BAD_REQUEST: 400,
  CONFLICT: 409,
  NOT_FOUND: 404,
};

/** The JSON-RPC number the client expects; only the `data.code` matters here. */
const TRPC_INTERNAL_SERVER_ERROR = -32_603;

/**
 * Answers `httpBatchLink` calls with plain resolvers keyed by procedure path
 * (`"authors.list"`), speaking the same superjson wire format as the API.
 */
export function trpc(resolvers: Record<string, Resolver>) {
  return http.all("*/trpc/:paths", async ({ params, request }) => {
    const inputs = await readBatchInputs(request);
    const paths = String(params.paths).split(",");
    let status = 200;
    const results = paths.map((path, index) => {
      const resolve = resolvers[path];
      if (!resolve) {
        throw new Error(`No test resolver for tRPC procedure "${path}"`);
      }
      const raw = inputs[String(index)];
      const input = raw === undefined ? undefined : superjson.deserialize(raw);
      try {
        return { result: { data: superjson.serialize(resolve(input)) } };
      } catch (error) {
        if (!(error instanceof TrpcError)) {
          throw error;
        }
        const httpStatus = TRPC_ERROR_HTTP_STATUS[error.code] ?? 500;
        // The response carries the worst status in the batch; each item keeps
        // its own, which is what the client reads per procedure.
        status = Math.max(status, httpStatus);
        return {
          error: {
            json: {
              code: TRPC_INTERNAL_SERVER_ERROR,
              data: {
                code: error.code,
                httpStatus,
                path,
                ...error.data,
              },
              message: error.message,
            },
          },
        };
      }
    });
    return HttpResponse.json(results, { status });
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
