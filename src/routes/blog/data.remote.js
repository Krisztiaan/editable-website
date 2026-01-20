// Remote functions for blog CRUD
import * as v from 'valibot';
import { query, command, getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import {
  getArticles as apiGetArticles,
  getArticleBySlug as apiGetArticleBySlug,
  createArticle as apiCreateArticle,
  updateArticle as apiUpdateArticle,
  deleteArticle as apiDeleteArticle
} from '$lib/api';

export const getPosts = query(async () => {
  const event = getRequestEvent();
  return await apiGetArticles(event.locals.user);
});

export const getPost = query(v.string(), async (slug) => {
  return await apiGetArticleBySlug(slug);
});

export const createPost = command(
  v.object({
    title: v.pipe(v.string(), v.nonEmpty()),
    content: v.pipe(v.string(), v.nonEmpty()),
    teaser: v.optional(v.string())
  }),
  async ({ title, content, teaser }) => {
    const event = getRequestEvent();
    const user = event.locals.user;
    if (!user) throw error(401, 'Unauthorized');
    const row = await apiCreateArticle(title, content, teaser, user);
    return { slug: row.slug };
  }
);

export const updatePost = command(
  v.object({
    slug: v.pipe(v.string(), v.nonEmpty()),
    title: v.pipe(v.string(), v.nonEmpty()),
    content: v.pipe(v.string(), v.nonEmpty()),
    teaser: v.optional(v.string())
  }),
  async ({ slug, title, content, teaser }) => {
    const event = getRequestEvent();
    const user = event.locals.user;
    if (!user) throw error(401, 'Unauthorized');
    await apiUpdateArticle(slug, title, content, teaser, user);
  }
);

export const deletePost = command(v.string(), async (slug) => {
  const event = getRequestEvent();
  const user = event.locals.user;
  if (!user) throw error(401, 'Unauthorized');
  await apiDeleteArticle(slug, user);
});
