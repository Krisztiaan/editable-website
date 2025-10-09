// Remote functions for generic page reading/saving
import * as v from 'valibot';
import { query, command, getRequestEvent } from '$app/server';
import { getPage as apiGetPage, createOrUpdatePage } from '$lib/api';
import { error } from '@sveltejs/kit';

export const getPageData = query(v.string(), async (pageId) => {
  return await apiGetPage(pageId);
});

export const savePageData = command(
  v.object({
    pageId: v.pipe(v.string(), v.nonEmpty()),
    // accept arbitrary JSON, validated in application layer as needed
    page: v.unknown()
  }),
  async ({ pageId, page }) => {
    const event = getRequestEvent();
    const user = event.locals.user;
    if (!user) error(401, 'Unauthorized');
    await createOrUpdatePage(pageId, page, user);
    return { pageId, status: 'ok' };
  }
);

