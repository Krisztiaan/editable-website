import { json } from '@sveltejs/kit';
import { createOrUpdatePage } from '$lib/api';
import { withSpan } from '$lib/tracing.server.js';

export async function POST({ request, locals }) {
  return withSpan('authoring.save_page', async (span) => {
    const currentUser = locals.user;
    const { pageId, page } = await request.json();
    span.setAttribute('app.page.id', pageId);
    span.setAttribute('user.authenticated', Boolean(currentUser));
    await createOrUpdatePage(pageId, page, currentUser);
    return json({ pageId, status: 'ok' });
  });
}
