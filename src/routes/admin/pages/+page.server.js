import { listPageIds } from '$lib/api';

export async function load({ locals }) {
  const pages = await listPageIds(locals.user);
  return { pages };
}

