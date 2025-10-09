import { json } from '@sveltejs/kit';
import { createArticle } from '$lib/api';
import { withSpan } from '$lib/tracing.server.js';

export async function POST({ request, locals }) {
  return withSpan('authoring.create_article', async (span) => {
    const currentUser = locals.user;
    const { title, content, teaser } = await request.json();
    span.setAttribute('user.authenticated', Boolean(currentUser));
    span.setAttribute('app.article.title_length', (title ?? '').length);
    span.setAttribute('app.article.content_length', (content ?? '').length);
    const { slug } = await createArticle(title, content, teaser, currentUser);
    span.setAttribute('app.article.slug', slug);
    return json({ slug });
  });
}
