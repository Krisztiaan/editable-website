import * as v from 'valibot';
import { command } from '$app/server';
import { createOrUpdateCounter } from '$lib/api';

export const incrementCounter = command(v.string(), async (id) => {
  return await createOrUpdateCounter(id);
});

