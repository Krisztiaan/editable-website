import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
  if (!locals.user) {
    throw redirect(303, '/login');
  }
  return { currentUser: locals.user, viewEnv: locals.envPointer || 'auto' };
}
