import * as v from 'valibot';
import { query, getRequestEvent } from '$app/server';
import { search as doSearch } from '$lib/api';

export const getSearch = query(v.string(), async (q) => {
  const event = getRequestEvent();
  return await doSearch(q, event.locals.user);
});

