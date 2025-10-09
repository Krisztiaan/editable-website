import { getCurrentUser } from '$lib/api';
// Initialize OpenTelemetry NodeSDK for adapter-node here (runs at server startup)
import '$lib/otel-init.server.js';
import { trace } from '@opentelemetry/api';

export async function handle({ event, resolve }) {
  // annotate the root span with request data
  try {
    event.tracing?.root?.setAttribute('http.method', event.request.method);
    event.tracing?.root?.setAttribute('url.path', event.url.pathname);
  } catch {}

  event.locals.user = await getCurrentUser(event.cookies.get('sessionid'));
  try {
    event.tracing?.root?.setAttribute('user.authenticated', Boolean(event.locals.user));
  } catch {}

  const response = await resolve(event);
  try {
    event.tracing?.root?.setAttribute('http.status_code', response.status);
    if (event.route?.id) event.tracing?.root?.setAttribute('route.id', event.route.id);
  } catch {}
  return response;
}
