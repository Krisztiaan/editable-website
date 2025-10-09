import { json } from '@sveltejs/kit';
import { deleteArticle } from '$lib/api';
import { withSpan } from '$lib/tracing.server.js';

export async function POST({ request, locals }) {
  return withSpan('authoring.delete_article', async (span) => {
    const user = locals.user;
    const { slug } = await request.json();
    span.setAttribute('user.authenticated', Boolean(user));
    span.setAttribute('app.article.slug', slug);
    const result = await deleteArticle(slug, user);
    return json(result);
  });
}
