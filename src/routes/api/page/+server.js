import { json } from '@sveltejs/kit';
import { getPage } from '$lib/api';

export async function GET({ url }) {
  const pageId = url.searchParams.get('id');
  const data = await getPage(pageId);
  return json({ pageId, data });
}

