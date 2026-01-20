import { listPageVersions } from '$lib/api';

export async function load({ locals, params }) {
  const pageId = params.pageId;
  const result = await listPageVersions(pageId, locals.user);
  return result;
}

