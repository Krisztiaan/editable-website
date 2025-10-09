import { env } from '$env/dynamic/private';

if (!globalThis.__otel_sdk_started) {
  try {
    // Default sampling: 100% in dev, 10% in production (can be overridden by env)
    if (!env.OTEL_TRACES_SAMPLER) {
      process.env.OTEL_TRACES_SAMPLER = 'parentbased_traceidratio';
      process.env.OTEL_TRACES_SAMPLER_ARG = env.NODE_ENV === 'production' ? '0.1' : '1';
    }
    const [
      { NodeSDK },
      { getNodeAutoInstrumentations },
      { OTLPTraceExporter },
      { Resource },
      { SemanticResourceAttributes },
      { createAddHookMessageChannel },
      { register }
    ] = await Promise.all([
      import('@opentelemetry/sdk-node'),
      import('@opentelemetry/auto-instrumentations-node'),
      import('@opentelemetry/exporter-trace-otlp-proto'),
      import('@opentelemetry/resources'),
      import('@opentelemetry/semantic-conventions'),
      import('import-in-the-middle'),
      import('node:module')
    ]);

    const { registerOptions } = createAddHookMessageChannel();
    register('import-in-the-middle/hook.mjs', import.meta.url, registerOptions);

    const serviceName = env.OTEL_SERVICE_NAME || 'editable-website';
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: env.DEPLOYMENT_ENV || env.NODE_ENV || 'development',
      [SemanticResourceAttributes.SERVICE_VERSION]: env.SERVICE_VERSION || ''
    });

    const sdk = new NodeSDK({
      resource,
      traceExporter: new OTLPTraceExporter(),
      instrumentations: [getNodeAutoInstrumentations()]
    });

    await sdk.start();
    process.on('SIGTERM', () => sdk.shutdown().finally(() => process.exit(0)));
    process.on('SIGINT', () => sdk.shutdown().finally(() => process.exit(0)));

    globalThis.__otel_sdk_started = true;
  } catch (e) {
    // If instrumentation packages are not present or init fails, continue without tracing
    // eslint-disable-next-line no-console
    console.warn('[otel-init] tracing disabled:', e?.message ?? e);
  }
}
