// Remote functions for generic page reading/saving
import * as v from 'valibot';
import { query, command, getRequestEvent } from '$app/server';
import { getPage as apiGetPage, createOrUpdatePage, publishPage, listPageVersions, setPagePointer } from '$lib/api';
import { error } from '@sveltejs/kit';

export const getPageData = query(v.string(), async (pageId) => {
  const event = getRequestEvent();
  return await apiGetPage(pageId, event.locals.user, event.locals.envPointer);
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
    if (!user) throw error(401, 'Unauthorized');
    return await createOrUpdatePage(pageId, page, user);
  }
);

export const publishPageData = command(v.string(), async (pageId) => {
  const event = getRequestEvent();
  const user = event.locals.user;
  if (!user) throw error(401, 'Unauthorized');
  return await publishPage(pageId, user);
});

export const getPageVersionsData = query(v.string(), async (pageId) => {
  const event = getRequestEvent();
  const user = event.locals.user;
  if (!user) throw error(401, 'Unauthorized');
  return await listPageVersions(pageId, user);
});

export const setPagePointerData = command(
  v.object({
    pageId: v.pipe(v.string(), v.nonEmpty()),
    pointer: v.pipe(v.string(), v.nonEmpty()),
    versionId: v.pipe(v.string(), v.nonEmpty())
  }),
  async ({ pageId, pointer, versionId }) => {
    const event = getRequestEvent();
    const user = event.locals.user;
    if (!user) throw error(401, 'Unauthorized');
    return await setPagePointer(pageId, pointer, versionId, user);
  }
);
