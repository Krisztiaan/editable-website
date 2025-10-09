import { createOrUpdateCounter } from '$lib/api';
import { withSpan } from '$lib/tracing.server.js';
import { json } from '@sveltejs/kit';

export async function GET({ url }) {
  return withSpan('app.counter', async (span) => {
    const counterId = url.searchParams.get('c');
    span.setAttribute('app.counter.id', String(counterId));
    return json(await createOrUpdateCounter(counterId, true));
  });
}
