import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { App } from "../src/app.js";
import { createTestApp } from "./app.js";

const BODY_LIMIT_BYTES = 1024 * 1024;

let app: App;
let db: Awaited<ReturnType<typeof createTestApp>>["db"];
let dispose: () => Promise<void>;

beforeEach(async () => {
  ({ app, db, dispose } = await createTestApp());
});

afterEach(async () => {
  await dispose();
});

function postJson(path: string, body: string, headers?: HeadersInit) {
  return app.request(path, {
    body,
    headers: { "content-type": "application/json", ...headers },
    method: "POST",
  });
}

describe("probes", () => {
  it("reports liveness", async () => {
    const res = await app.request("/healthz");

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok" });
  });

  it("reports ready while the database answers", async () => {
    const res = await app.request("/readyz");

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ready" });
  });

  it("reports not ready once the database is unreachable", async () => {
    db.close();

    const res = await app.request("/readyz");

    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ status: "not_ready" });
  });
});

describe("request id", () => {
  it("generates one when the caller sends none", async () => {
    const res = await app.request("/healthz");

    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("propagates the upstream id", async () => {
    const res = await app.request("/healthz", {
      headers: { "x-request-id": "edge-123" },
    });

    expect(res.headers.get("x-request-id")).toBe("edge-123");
  });
});

describe("error contract", () => {
  it("returns a JSON 404 that carries the request id", async () => {
    const res = await app.request("/missing");

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: "NOT_FOUND",
      path: "/missing",
      requestId: res.headers.get("x-request-id"),
    });
  });

  it("rejects bodies over the limit with 413", async () => {
    const res = await postJson(
      "/trpc/authors.create",
      "x".repeat(BODY_LIMIT_BYTES + 1)
    );

    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({
      error: "PAYLOAD_TOO_LARGE",
      requestId: res.headers.get("x-request-id"),
    });
  });

  it("returns field errors and the request id for invalid tRPC input", async () => {
    const res = await postJson(
      "/trpc/authors.create",
      JSON.stringify({ json: { name: "" } })
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.json.data).toMatchObject({
      code: "BAD_REQUEST",
      requestId: res.headers.get("x-request-id"),
      zodError: { fieldErrors: { name: expect.any(Array) } },
    });
  });

  it("masks internal failures behind a generic message", async () => {
    db.close();

    const res = await app.request("/trpc/authors.list");
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.json.message).toBe("Internal server error");
    expect(body.error.json.data).toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      requestId: res.headers.get("x-request-id"),
    });
  });
});
