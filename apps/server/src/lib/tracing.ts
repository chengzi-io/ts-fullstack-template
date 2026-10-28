import type { Resource } from "@opentelemetry/resources";

export interface TracingHandle {
  shutdown: () => Promise<void>;
}

export interface StartTracingOptions {
  /** `OTEL_EXPORTER_OTLP_ENDPOINT`; unset means tracing stays off. */
  endpoint: string | undefined;
}

const noopHandle: TracingHandle = { shutdown: () => Promise.resolve() };

/**
 * The SDK (2.x) no longer folds `OTEL_SERVICE_NAME` or `OTEL_RESOURCE_ATTRIBUTES`
 * into its default resource, so read them here: service name wins over the
 * same key in `OTEL_RESOURCE_ATTRIBUTES`, per the OTel spec.
 */
export async function createTracingResource(): Promise<Resource> {
  const {
    defaultResource,
    detectResources,
    envDetector,
    resourceFromAttributes,
  } = await import("@opentelemetry/resources");

  const detected = detectResources({ detectors: [envDetector] });
  const serviceName = process.env.OTEL_SERVICE_NAME;
  const resource = defaultResource().merge(detected);

  return serviceName
    ? resource.merge(resourceFromAttributes({ "service.name": serviceName }))
    : resource;
}

/**
 * Opt-in tracing. Without an endpoint nothing from the SDK or the exporter is
 * loaded, so the API keeps its no-op tracer and startup pays nothing.
 *
 * The OTLP exporter reads `OTEL_EXPORTER_OTLP_ENDPOINT` and
 * `OTEL_EXPORTER_OTLP_HEADERS` itself; the sampler variables are SDK defaults.
 */
export async function startTracing(
  options: StartTracingOptions
): Promise<TracingHandle> {
  if (!options.endpoint) {
    return noopHandle;
  }

  const [
    { BatchSpanProcessor, NodeTracerProvider },
    { OTLPTraceExporter },
    resource,
  ] = await Promise.all([
    import("@opentelemetry/sdk-trace-node"),
    import("@opentelemetry/exporter-trace-otlp-http"),
    createTracingResource(),
  ]);

  const provider = new NodeTracerProvider({
    resource,
    spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())],
  });
  provider.register();

  return { shutdown: () => provider.shutdown() };
}
