import { getCurrentUser } from '$lib/api';

export async function handle({ event, resolve }) {
  // annotate the root span with request data
  try {
    event.tracing?.root?.setAttribute('http.method', event.request.method);
    event.tracing?.root?.setAttribute('url.path', event.url.pathname);
  } catch { /* ignore tracing */ }

  event.locals.user = await getCurrentUser(event.cookies.get('sessionid'));
  try {
    event.tracing?.root?.setAttribute('user.authenticated', Boolean(event.locals.user));
  } catch { /* ignore tracing */ }

  const response = await resolve(event);
  try {
    event.tracing?.root?.setAttribute('http.status_code', response.status);
    if (event.route?.id) event.tracing?.root?.setAttribute('route.id', event.route.id);
  } catch { /* ignore tracing */ }
  return response;
}
