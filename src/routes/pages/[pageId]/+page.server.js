import { error } from '@sveltejs/kit';
import { getPage } from '$lib/api';

export async function load({ locals, params }) {
  const pageId = params.pageId;
  const page = await getPage(pageId, locals.user, locals.envPointer);
  if (!page) throw error(404, 'Not found');

  return {
    currentUser: locals.user,
    pageId,
    page
  };
}
