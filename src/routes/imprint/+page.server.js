import { getPage } from '$lib/api';

export async function load({ locals, url }) {
  const currentUser = locals.user;
  const env = url.searchParams.get('env');
  const pointerOverride =
    env === 'prod' || env === 'staging' || env === 'preview' ? env : locals.envPointer;
  const page = await getPage('imprint', currentUser, pointerOverride);
  return {
    currentUser,
    page
  };
}
