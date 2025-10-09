import { json } from '@sveltejs/kit';
import { updateArticle } from '$lib/api';
import { withSpan } from '$lib/tracing.server.js';

export async function POST({ request, locals }) {
  return withSpan('authoring.update_article', async (span) => {
    const currentUser = locals.user;
    const { slug, title, content, teaser } = await request.json();
    span.setAttribute('app.article.slug', slug);
    span.setAttribute('user.authenticated', Boolean(currentUser));
    span.setAttribute('app.article.title_length', (title ?? '').length);
    span.setAttribute('app.article.content_length', (content ?? '').length);
    await updateArticle(slug, title, content, teaser, currentUser);
    return json({ slug, status: 'ok' });
  });
}
