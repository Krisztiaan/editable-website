import { redirect, fail } from '@sveltejs/kit';
import { authenticate } from '$lib/api';

export const actions = {
  default: async (event) => {
    const { cookies, request } = event;
    const data = await request.formData();
    const password = data.get('password');
    const sessionTimeout = 60 * 24 * 7; // one week in minutes
    try {
      const { sessionId } = await authenticate(password, sessionTimeout);
      cookies.set('sessionid', sessionId, { path: '/' });
      try {
        event.tracing?.current?.setAttribute('app.auth.success', true);
      } catch { /* ignore tracing */ }
    } catch (err) {
      console.error(err);
      try {
        event.tracing?.current?.setAttribute('app.auth.success', false);
      } catch { /* ignore tracing */ }
      return fail(400, { incorrect: true });
    }
    redirect(303, '/');
  }
};
