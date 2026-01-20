import { redirect } from '@sveltejs/kit';
import { getPage } from '$lib/api';

export async function load({ locals, params }) {
  if (!locals.user) throw redirect(303, '/login');

  const pageId = params.pageId;
  const page = await getPage(pageId, locals.user);

  return {
    currentUser: locals.user,
    pageId,
    page
  };
}
