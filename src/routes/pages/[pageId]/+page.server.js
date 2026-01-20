import { error } from '@sveltejs/kit';
import { getPage } from '$lib/api';

export async function load({ locals, params, url }) {
  const pageId = params.pageId;
  const env = url.searchParams.get('env');
  const pointerOverride =
    env === 'prod' || env === 'staging' || env === 'preview' ? env : locals.envPointer;
  const page = await getPage(pageId, locals.user, pointerOverride);
  if (!page) throw error(404, 'Not found');

  return {
    currentUser: locals.user,
    pageId,
    page
  };
}
