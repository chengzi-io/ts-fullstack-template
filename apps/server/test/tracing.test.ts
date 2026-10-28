import { trace } from "@opentelemetry/api";
import {
  InMemorySpanExporter,
  NodeTracerProvider,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-node";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { createTracingResource, startTracing } from "../src/lib/tracing.js";
import { createTestApp } from "./app.js";

const SERVICE_NAME = "server-tracing-test";

describe("tracing without a provider", () => {
  // No provider may leak in from the suite below or a reordered run.
  beforeEach(() => {
    trace.disable();
  });

  it("stays a no-op when the endpoint is unset", async () => {
    const tracing = await startTracing({ endpoint: undefined });
    const { app, dispose, logs } = await createTestApp();

    await app.request("/");

    expect(logs.some((entry) => "trace_id" in entry)).toBe(false);

    await dispose();
    await expect(tracing.shutdown()).resolves.toBeUndefined();
  });
});

describe("tracing with a provider", () => {
  const exporter = new InMemorySpanExporter();
  let provider: NodeTracerProvider;

  /** Same resource and processor wiring as `startTracing`, but in-memory. */
  beforeAll(async () => {
    vi.stubEnv("OTEL_SERVICE_NAME", SERVICE_NAME);
    provider = new NodeTracerProvider({
      resource: await createTracingResource(),
      spanProcessors: [new SimpleSpanProcessor(exporter)],
    });
    provider.register();
  });

  afterAll(async () => {
    await provider.shutdown();
    trace.disable();
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    exporter.reset();
  });

  it("records one server span per request", async () => {
    const { app, dispose } = await createTestApp();

    await app.request("/");

    const spans = exporter.getFinishedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0]?.kind).toBe(1);
    expect(spans[0]?.name).toBe("GET /");
    expect(spans[0]?.attributes["http.response.status_code"]).toBe(200);

    await dispose();
  });

  it("stamps the access log line with that span's trace id", async () => {
    const { app, dispose, logs } = await createTestApp();

    await app.request("/");

    const [span] = exporter.getFinishedSpans();
    const spanContext = span?.spanContext();
    const accessLine = logs.find((entry) => entry.msg === "request");
    expect(accessLine).toMatchObject({
      span_id: spanContext?.spanId,
      trace_flags: spanContext?.traceFlags,
      trace_id: spanContext?.traceId,
    });

    await dispose();
  });

  it("takes service.name from OTEL_SERVICE_NAME", async () => {
    const { app, dispose } = await createTestApp();

    await app.request("/");

    const [span] = exporter.getFinishedSpans();
    expect(span?.resource.attributes["service.name"]).toBe(SERVICE_NAME);

    await dispose();
  });
});
