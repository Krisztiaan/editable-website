import { search } from '$lib/api';
import { withSpan } from '$lib/tracing.server.js';
import { json } from '@sveltejs/kit';

export async function GET({ url, locals }) {
  return withSpan('app.search', async (span) => {
    const currentUser = locals.user;
    const searchQuery = url.searchParams.get('q') || '';
    span.setAttribute('app.search.q_length', searchQuery.length);
    span.setAttribute('user.authenticated', Boolean(currentUser));
    return json(await search(searchQuery, currentUser));
  });
}
