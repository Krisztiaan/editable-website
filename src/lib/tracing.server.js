import { trace, SpanStatusCode } from '@opentelemetry/api';

export const tracer = trace.getTracer('editable-website');

export async function withSpan(name, run, attributes = {}) {
  return tracer.startActiveSpan(name, async (span) => {
    try {
      for (const [k, v] of Object.entries(attributes)) span.setAttribute(k, v);
      const result = await run(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: /** @type {Error} */(err)?.message });
      throw err;
    } finally {
      span.end();
    }
  });
}

