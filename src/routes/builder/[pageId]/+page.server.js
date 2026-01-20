import { error, redirect } from '@sveltejs/kit';
import { acquirePageLock, getPage } from '$lib/api';

export async function load({ locals, params }) {
  if (!locals.user) throw redirect(303, '/login');

  const pageId = params.pageId;
  try {
    acquirePageLock(pageId, locals.user);
  } catch (err) {
    throw error(423, err instanceof Error ? err.message : 'Locked');
  }
  const page = await getPage(pageId, locals.user);

  return {
    currentUser: locals.user,
    pageId,
    page
  };
}
