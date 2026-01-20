import { getArticles, getPage } from '$lib/api';

export async function load({ locals, url }) {
  const currentUser = locals.user;
  const articles = await getArticles();
  const env = url.searchParams.get('env');
  const pointerOverride =
    env === 'prod' || env === 'staging' || env === 'preview' ? env : locals.envPointer;
  const page = await getPage('home', currentUser, pointerOverride);

  return {
    currentUser,
    articles: articles.slice(0, 3),
    page
  };
}
