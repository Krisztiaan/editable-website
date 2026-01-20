import { error, redirect } from '@sveltejs/kit';

export async function POST({ request, cookies, locals, url }) {
  if (!locals.user) throw redirect(303, '/login');

  const data = await request.formData();
  const env = data.get('env');
  if (env === 'auto') {
    cookies.delete('env', { path: '/' });
  } else {
    if (env !== 'prod' && env !== 'staging' && env !== 'preview') {
      throw error(400, 'Invalid env');
    }

    cookies.set('env', env, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: url.protocol === 'https:',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });
  }

  let redirectTo = '/admin/pages';
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.origin === url.origin) {
        redirectTo = refererUrl.pathname + refererUrl.search;
      }
    } catch {
      // ignore invalid/malicious referrers
    }
  }

  throw redirect(303, redirectTo);
}
