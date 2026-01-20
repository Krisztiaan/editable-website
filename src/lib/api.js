import slugify from 'slugify';
import { SHORTCUTS } from './constants';
import Database from 'better-sqlite3';
import { nanoid } from '$lib/util';
import { env } from '$env/dynamic/private';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Blob } from 'node:buffer';
import { tracer } from '$lib/tracing.server.js';

const db = new Database(env.DB_PATH, {
  // verbose: console.log
});
db.pragma('journal_mode = WAL');
db.pragma('case_sensitive_like = true');

// Ensure schema is present (idempotent)
try {
  const requiredTables = [
    'sessions',
    'pages',
    'articles',
    'page_versions',
    'page_pointers',
    'page_pointer_events',
    'page_locks'
  ];
  const hasTable = (name) =>
    db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);

  const needsInit = requiredTables.some((t) => !hasTable(t));
  if (needsInit) {
    const thisDir = dirname(fileURLToPath(import.meta.url));
    const schemaPath = new URL('../../sql/schema.sql', `file://${thisDir}/`);
    const sql = readFileSync(schemaPath, 'utf-8');
    db.exec(sql);
  }

  // Best-effort migration: seed versioned pages from legacy `pages` table
  // so authenticated users can read the `preview` pointer immediately.
  if (hasTable('page_versions') && hasTable('page_pointers') && hasTable('pages')) {
    const legacyPages = db.prepare('SELECT page_id, data FROM pages').all();
    const now = new Date().toISOString();

    const getPointer = db.prepare(
      'SELECT version_id FROM page_pointers WHERE page_id = ? AND pointer = ?'
    );
    const insertVersion = db.prepare(
      'INSERT INTO page_versions (version_id, page_id, data, created_at, created_by) VALUES (?, ?, ?, ?, ?)'
    );
    const upsertPointer = db.prepare(
      `INSERT INTO page_pointers (page_id, pointer, version_id, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(page_id, pointer) DO UPDATE SET
         version_id = excluded.version_id,
         updated_at = excluded.updated_at,
         updated_by = excluded.updated_by`
    );

    for (const row of legacyPages) {
      const prod = getPointer.get(row.page_id, 'prod')?.version_id;
      const preview = getPointer.get(row.page_id, 'preview')?.version_id;
      const staging = getPointer.get(row.page_id, 'staging')?.version_id;

      if (!prod) {
        const versionId = nanoid();
        insertVersion.run(versionId, row.page_id, row.data, now, 'system');
        upsertPointer.run(row.page_id, 'prod', versionId, now, 'system');
        upsertPointer.run(row.page_id, 'preview', versionId, now, 'system');
        upsertPointer.run(row.page_id, 'staging', versionId, now, 'system');
      } else if (!preview) {
        upsertPointer.run(row.page_id, 'preview', prod, now, 'system');
      }
      if (prod && !staging) {
        upsertPointer.run(row.page_id, 'staging', prod, now, 'system');
      }
    }
  }
} catch {
  // Best-effort initialization; surface error to caller if operations fail later
}

function recordPointerEvent({ pageId, pointer, fromVersionId, toVersionId, now, user }) {
  try {
    dbSpan(
      'insert',
      'page_pointer_events',
      {
        'app.page.id': pageId,
        'app.page.pointer': pointer
      },
      () =>
        db
          .prepare(
            `INSERT INTO page_pointer_events
             (event_id, page_id, pointer, from_version_id, to_version_id, changed_at, changed_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            nanoid(),
            pageId,
            pointer,
            fromVersionId || null,
            toVersionId,
            now,
            user?.name || 'Admin'
          )
    );
  } catch {
    // best-effort; don't block pointer changes on audit logging
  }
}

export function acquirePageLock(pageId, user, ttlSeconds = 60 * 10) {
  if (!user) throw new Error('Not authorized');
  if (!user.sessionId) throw new Error('Missing session');

  const now = new Date();
  const nowIso = now.toISOString();
  const lockedUntil = new Date(now.getTime() + ttlSeconds * 1000).toISOString();

  // Ensure the row exists.
  dbSpan('insert', 'page_locks', { 'app.page.id': pageId }, () =>
    db
      .prepare(
        `INSERT OR IGNORE INTO page_locks (page_id, locked_by, locked_by_name, locked_until, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(pageId, user.sessionId, user.name || 'Admin', lockedUntil, nowIso)
  );

  const lock = dbSpan('select', 'page_locks', { 'app.page.id': pageId }, () =>
    db
      .prepare('SELECT locked_by, locked_by_name, locked_until FROM page_locks WHERE page_id = ?')
      .get(pageId)
  );

  if (!lock) throw new Error('Lock unavailable');

  const expired = lock.locked_until < nowIso;
  const owned = lock.locked_by === user.sessionId;
  if (!expired && !owned) {
    throw new Error(`Locked by ${lock.locked_by_name || 'another user'} until ${lock.locked_until}`);
  }

  dbSpan('update', 'page_locks', { 'app.page.id': pageId }, () =>
    db
      .prepare(
        `UPDATE page_locks
         SET locked_by = ?, locked_by_name = ?, locked_until = ?, updated_at = ?
         WHERE page_id = ?`
      )
      .run(user.sessionId, user.name || 'Admin', lockedUntil, nowIso, pageId)
  );
}

function dbSpan(op, table, attrs, fn) {
  return tracer.startActiveSpan('db.sqlite.' + op, (span) => {
    try {
      span.setAttribute('db.system', 'sqlite');
      span.setAttribute('db.operation', op);
      if (table) span.setAttribute('db.sql.table', table);
      if (env.DB_PATH) span.setAttribute('db.file', env.DB_PATH);
      for (const [k, v] of Object.entries(attrs || {})) span.setAttribute(k, v);
      const result = fn();
      return result;
    } catch (err) {
      span.recordException(err);
      throw err;
    } finally {
      span.end();
    }
  });
}


/**
 * Creates a new article
 */
export async function createArticle(title, content, teaser, currentUser) {
  if (!currentUser) throw new Error('Not authorized');

    let slug = slugify(title, {
      lower: true,
      strict: true
    });

    // If slug is already used, we add a unique postfix
    const articleExists = dbSpan('select', 'articles', { 'app.article.slug': slug }, () =>
      db.prepare('SELECT * FROM articles WHERE slug = ?').get(slug)
    );
    if (articleExists) {
      slug = slug + '-' + nanoid();
    }

    dbSpan('insert', 'articles', { 'app.article.slug': slug }, () => db.prepare(`
        INSERT INTO articles (slug, title, content, teaser, published_at)
        VALUES(?, ?, ?, ?, DATETIME('now'))
      `)
      .run(
        slug,
        title,
        content,
        teaser
      ));

  const newArticleQuery = "SELECT slug, created_at FROM articles WHERE slug = ?";
  const newArticle = dbSpan('select', 'articles', { 'app.article.slug': slug }, () =>
    db.prepare(newArticleQuery).get(slug)
  );
  return newArticle;
}

/**
 * We automatically extract a teaser text from the document's content.
 */
export async function updateArticle(slug, title, content, teaser, currentUser) {
  if (!currentUser) throw new Error('Not authorized');

  const query = `
    UPDATE articles
    SET title = ?, content = ?, teaser = ?, updated_at = datetime('now')
    WHERE slug = ?
  `;
  dbSpan('update', 'articles', { 'app.article.slug': slug }, () => {
    const updateStmt = db.prepare(query);
    updateStmt.run(title, content, teaser, slug);
  });

  const updatedArticleQuery = "SELECT slug, updated_at FROM articles WHERE slug = ?";
  const updatedArticle = dbSpan('select', 'articles', { 'app.article.slug': slug }, () =>
    db.prepare(updatedArticleQuery).get(slug)
  );

  return updatedArticle;
}

/*
  This can be replaced with any user-based authentication system
*/
export async function authenticate(password, sessionTimeout) {
  const expires = __getDateTimeMinutesAfter(sessionTimeout);
  if (password === env.ADMIN_PASSWORD) {
    const sessionId = nanoid();

    // Now is a good time to remove expired sessions
    dbSpan('delete', 'sessions', {}, () =>
      db.prepare('DELETE FROM sessions WHERE expires < ?').run(new Date().toISOString())
    );

    // Create a new session
    dbSpan('insert', 'sessions', {}, () =>
      db
        .prepare('INSERT INTO sessions (session_id, expires) values(?, ?) returning session_id')
        .run(sessionId, expires)
    );

    return { sessionId };
  } else {
    throw 'Authentication failed.';
  }
}

/*
  Log out of the admin session ...
*/
export async function destroySession(sessionId) {
  dbSpan('delete', 'sessions', {}, () =>
    db.prepare('DELETE FROM sessions WHERE session_id = ?').run(sessionId)
  );
  return true;
}

/**
 * List all available articles (newest first)
 */
export async function getArticles(currentUser) {
  let articles;
  let statement;

  if (currentUser) {
    // When logged in, show both drafts and published articles
    statement = db.prepare(
      'SELECT *, COALESCE(published_at, updated_at, created_at) AS modified_at FROM articles ORDER BY modified_at DESC'
    );
  } else {
    statement = db.prepare(
      'SELECT * FROM articles WHERE published_at IS NOT NULL ORDER BY published_at DESC'
    );
  }

  articles = dbSpan('select', 'articles', {}, () => statement.all());
  return articles;
}

/**
 * Given a slug, determine article to "read next"
 */
export async function getNextArticle(slug) {
  const query = `
    WITH previous_published AS (
      SELECT
        title,
        teaser,
        slug,
        published_at
      FROM articles
      WHERE
        published_at < (SELECT published_at FROM articles WHERE slug = ?)
      ORDER BY published_at DESC
      LIMIT 1
    ),
    latest_article AS (
      SELECT
        title,
        teaser,
        slug,
        published_at
      FROM articles
      WHERE slug <> ?
      ORDER BY published_at DESC
      LIMIT 1
    )
    SELECT title, teaser, slug, published_at
    FROM (
      SELECT * FROM previous_published
      UNION
      SELECT * FROM latest_article
    )
    ORDER BY published_at ASC
    LIMIT 1;
  `;

  const result = dbSpan('select', 'articles', {}, () => db.prepare(query).get(slug, slug));
  return result;
}

/**
 * Search within all searchable items (including articles and website sections)
 */
export async function search(q, currentUser) {
  let query;
  if (currentUser) {
    query = `
      SELECT title AS name, '/blog/' || slug AS url, COALESCE(published_at, updated_at, created_at) AS modified_at
      FROM articles
      WHERE title LIKE ? COLLATE NOCASE
      ORDER BY modified_at DESC;
    `;
  } else {
    query = `
      SELECT title AS name, '/blog/' || slug AS url, COALESCE(published_at, updated_at, created_at) AS modified_at
      FROM articles
      WHERE title LIKE ? COLLATE NOCASE AND published_at IS NOT NULL
      ORDER BY modified_at DESC;
    `;
  }

  const results = dbSpan('select', 'articles', { 'app.search.q_length': q.length }, () =>
    db.prepare(query).all(`%${q}%`)
  );

  // Also include predefined shortcuts in search
  SHORTCUTS.forEach(shortcut => {
    if (shortcut.name.toLowerCase().includes(q.toLowerCase())) {
      results.push(shortcut);
    }
  });

  return results;
}

/**
 * Retrieve article based on a given slug
 */
export async function getArticleBySlug(slug) {
  const query = "SELECT * FROM articles WHERE slug = ?";
  const article = dbSpan('select', 'articles', { 'app.article.slug': slug }, () =>
    db.prepare(query).get(slug)
  );
  return article;
}

/**
 * Remove the entire article
 */
export async function deleteArticle(slug, currentUser) {
  if (!currentUser) throw new Error('Not authorized');

  const query = "DELETE FROM articles WHERE slug = ?";
  const result = dbSpan('delete', 'articles', { 'app.article.slug': slug }, () =>
    db.prepare(query).run(slug)
  );

  return result.changes > 0;
}

/**
 * In this minimal setup there is only one user, the website admin.
 * If you want to support multiple users/authors you want to return the current user record here.
 */
/**
 * In this minimal setup there is only one user, the website admin.
 * If you want to support multiple users/authors you want to return the current user record here.
 */
export async function getCurrentUser(session_id) {
  const stmt = db.prepare(
    'SELECT session_id, expires FROM sessions WHERE session_id = ? AND expires > ?'
  );
  const session = dbSpan('select', 'sessions', {}, () =>
    stmt.get(session_id, new Date().toISOString())
  );

  if (session) {
    return { name: 'Admin', sessionId: session.session_id };
  } else {
    return null;
  }
}


/**
 * Update the page
 */
export async function createOrUpdatePage(page_id, page, currentUser) {
  if (!currentUser) throw new Error('Not authorized');
  acquirePageLock(page_id, currentUser);

  const versionId = nanoid();
  const now = new Date().toISOString();
  const data = JSON.stringify(page);

  dbSpan('insert', 'page_versions', { 'app.page.id': page_id, 'app.page.version': versionId }, () =>
    db
      .prepare(
        'INSERT INTO page_versions (version_id, page_id, data, created_at, created_by) VALUES (?, ?, ?, ?, ?)'
      )
      .run(versionId, page_id, data, now, currentUser.name || 'Admin')
  );

  const prevPreviewVersionId = dbSpan(
    'select',
    'page_pointers',
    { 'app.page.id': page_id, 'app.page.pointer': 'preview' },
    () =>
      db
        .prepare('SELECT version_id FROM page_pointers WHERE page_id = ? AND pointer = ?')
        .get(page_id, 'preview')
  )?.version_id;

  dbSpan('upsert', 'page_pointers', { 'app.page.id': page_id, 'app.page.pointer': 'preview' }, () =>
    db
      .prepare(
        `INSERT INTO page_pointers (page_id, pointer, version_id, updated_at, updated_by)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(page_id, pointer) DO UPDATE SET
           version_id = excluded.version_id,
           updated_at = excluded.updated_at,
           updated_by = excluded.updated_by`
      )
      .run(page_id, 'preview', versionId, now, currentUser.name || 'Admin')
  );

  if (prevPreviewVersionId !== versionId) {
    recordPointerEvent({
      pageId: page_id,
      pointer: 'preview',
      fromVersionId: prevPreviewVersionId || null,
      toVersionId: versionId,
      now,
      user: currentUser
    });
  }

  return { pageId: page_id, versionId, pointer: 'preview' };
}

/**
 * E.g. getPage("home") gets all dynamic data for the home page
 */
export async function getPage(page_id, currentUser, pointerOverride = null) {
  const pointer = currentUser ? pointerOverride || 'preview' : 'prod';
  return await getPageByPointer(page_id, pointer);
}

export async function listPageIds(currentUser) {
  if (!currentUser) throw new Error('Not authorized');

  const ids = new Set();

  // Prefer versioned pages
  try {
    const rows = dbSpan('select', 'page_versions', {}, () =>
      db.prepare('SELECT DISTINCT page_id FROM page_versions').all()
    );
    for (const r of rows) ids.add(r.page_id);
  } catch {
    // ignore if table missing
  }

  // Legacy fallback
  try {
    const rows = dbSpan('select', 'pages', {}, () => db.prepare('SELECT page_id FROM pages').all());
    for (const r of rows) ids.add(r.page_id);
  } catch {
    // ignore if table missing
  }

  return Array.from(ids).sort();
}

export async function listPageVersions(page_id, currentUser) {
  if (!currentUser) throw new Error('Not authorized');

  const pointers = dbSpan('select', 'page_pointers', { 'app.page.id': page_id }, () =>
    db
      .prepare(
        'SELECT pointer, version_id, updated_at, updated_by FROM page_pointers WHERE page_id = ?'
      )
      .all(page_id)
  );

  const versions = dbSpan('select', 'page_versions', { 'app.page.id': page_id }, () =>
    db
      .prepare(
        'SELECT version_id, created_at, created_by FROM page_versions WHERE page_id = ? ORDER BY created_at DESC'
      )
      .all(page_id)
  );

  let events = [];
  try {
    events = dbSpan('select', 'page_pointer_events', { 'app.page.id': page_id }, () =>
      db
        .prepare(
          `SELECT event_id, pointer, from_version_id, to_version_id, changed_at, changed_by
           FROM page_pointer_events
           WHERE page_id = ?
           ORDER BY changed_at DESC
           LIMIT 50`
        )
        .all(page_id)
    );
  } catch {
    // ignore if table missing
  }

  let lock = null;
  try {
    lock = dbSpan('select', 'page_locks', { 'app.page.id': page_id }, () =>
      db
        .prepare(
          `SELECT locked_by, locked_by_name, locked_until, updated_at
           FROM page_locks
           WHERE page_id = ?`
        )
        .get(page_id)
    );
  } catch {
    // ignore if table missing
  }

  return { pageId: page_id, pointers, versions, events, lock };
}

export async function setPagePointer(page_id, pointer, version_id, currentUser) {
  if (!currentUser) throw new Error('Not authorized');
  if (pointer !== 'preview' && pointer !== 'staging' && pointer !== 'prod') throw new Error('Invalid pointer');

  const prevVersionId = dbSpan(
    'select',
    'page_pointers',
    { 'app.page.id': page_id, 'app.page.pointer': pointer },
    () =>
      db
        .prepare('SELECT version_id FROM page_pointers WHERE page_id = ? AND pointer = ?')
        .get(page_id, pointer)
  )?.version_id;

  const version = dbSpan('select', 'page_versions', { 'app.page.id': page_id }, () =>
    db
      .prepare('SELECT version_id FROM page_versions WHERE page_id = ? AND version_id = ?')
      .get(page_id, version_id)
  );
  if (!version) throw new Error('Version not found');

  const now = new Date().toISOString();
  dbSpan('upsert', 'page_pointers', { 'app.page.id': page_id, 'app.page.pointer': pointer }, () =>
    db
      .prepare(
        `INSERT INTO page_pointers (page_id, pointer, version_id, updated_at, updated_by)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(page_id, pointer) DO UPDATE SET
           version_id = excluded.version_id,
           updated_at = excluded.updated_at,
           updated_by = excluded.updated_by`
      )
      .run(page_id, pointer, version_id, now, currentUser.name || 'Admin')
  );

  if (prevVersionId !== version_id) {
    recordPointerEvent({
      pageId: page_id,
      pointer,
      fromVersionId: prevVersionId || null,
      toVersionId: version_id,
      now,
      user: currentUser
    });
  }

  return { pageId: page_id, versionId: version_id, pointer };
}

export async function publishPage(page_id, currentUser) {
  if (!currentUser) throw new Error('Not authorized');
  acquirePageLock(page_id, currentUser);

  const previewVersionId = dbSpan('select', 'page_pointers', { 'app.page.id': page_id }, () =>
    db
      .prepare('SELECT version_id FROM page_pointers WHERE page_id = ? AND pointer = ?')
      .get(page_id, 'preview')
  )?.version_id;

  if (!previewVersionId) {
    throw new Error('No preview version found to publish');
  }

  const now = new Date().toISOString();

  const prevProdVersionId = dbSpan(
    'select',
    'page_pointers',
    { 'app.page.id': page_id, 'app.page.pointer': 'prod' },
    () =>
      db
        .prepare('SELECT version_id FROM page_pointers WHERE page_id = ? AND pointer = ?')
        .get(page_id, 'prod')
  )?.version_id;

  dbSpan('upsert', 'page_pointers', { 'app.page.id': page_id, 'app.page.pointer': 'prod' }, () =>
    db
      .prepare(
        `INSERT INTO page_pointers (page_id, pointer, version_id, updated_at, updated_by)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(page_id, pointer) DO UPDATE SET
           version_id = excluded.version_id,
           updated_at = excluded.updated_at,
           updated_by = excluded.updated_by`
      )
      .run(page_id, 'prod', previewVersionId, now, currentUser.name || 'Admin')
  );

  if (prevProdVersionId !== previewVersionId) {
    recordPointerEvent({
      pageId: page_id,
      pointer: 'prod',
      fromVersionId: prevProdVersionId || null,
      toVersionId: previewVersionId,
      now,
      user: currentUser
    });
  }

  return { pageId: page_id, versionId: previewVersionId, pointer: 'prod' };
}

async function getPageByPointer(page_id, pointer) {
  // Prefer versioned pages
  const versionId = dbSpan('select', 'page_pointers', { 'app.page.id': page_id }, () =>
    db
      .prepare('SELECT version_id FROM page_pointers WHERE page_id = ? AND pointer = ?')
      .get(page_id, pointer)
  )?.version_id;

  if (versionId) {
    const row = dbSpan('select', 'page_versions', { 'app.page.id': page_id }, () =>
      db.prepare('SELECT data FROM page_versions WHERE version_id = ?').get(versionId)
    );
    if (row?.data) return JSON.parse(row.data);
  }

  // Fallback: if preview missing, try prod
  if (pointer === 'preview' || pointer === 'staging') {
    return await getPageByPointer(page_id, 'prod');
  }

  // Legacy fallback: pre-versioned `pages` table
  const legacy = dbSpan('select', 'pages', { 'app.page.id': page_id }, () =>
    db.prepare('SELECT data FROM pages WHERE page_id = ?').get(page_id)
  );
  if (legacy?.data) return JSON.parse(legacy.data);
  return null;
}

/**
 * We can count all kinds of things with this.
 */
export async function createOrUpdateCounter(counter_id) {
  return dbSpan('transaction', 'counters', { 'app.counter.id': counter_id }, () => db.transaction(() => {
    // Remove recipients associated with the friend if there are any entries
    const counter_exists = db
      .prepare('SELECT counter_id FROM counters WHERE counter_id = ?')
      .get(counter_id);
    if (counter_exists) {
      return db
        .prepare('UPDATE counters SET count = count + 1 WHERE counter_id = ? RETURNING count')
        .get(counter_id);
    } else {
      return db
        .prepare('INSERT INTO counters (counter_id, count) values(?, 1) RETURNING count')
        .get(counter_id);
    }
  })())
}

// asset_id is a string and has the form path
export async function storeAsset(asset_id, file) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const sql = `
  INSERT into assets (asset_id, mime_type, updated_at, size, data) VALUES (?, ?, ?, ?, ?)
  ON CONFLICT (asset_id) DO
  UPDATE
     SET mime_type = excluded.mime_type,
         updated_at = excluded.updated_at,
         size = excluded.size,
         data = excluded.data
  WHERE asset_id = excluded.asset_id
  `;
  dbSpan('upsert', 'assets', { 'app.asset.id': asset_id, 'app.asset.size': file.size }, () => {
    const stmnt = db.prepare(sql);
    stmnt.run(asset_id, file.type, new Date().toISOString(), file.size, buffer);
  });
}

export function getAsset(asset_id) {
  const sql = `
  SELECT
    asset_id,
    mime_type,
    updated_at,
    size,
    data
  FROM assets
  WHERE asset_id = ?
  `;

  const stmnt = db.prepare(sql);
  const row = dbSpan('select', 'assets', { 'app.asset.id': asset_id }, () =>
    stmnt.get(asset_id)
  );
  return {
    filename: row.asset_id.split('/').slice(-1),
    mimeType: row.mime_type,
    lastModified: row.updated_at,
    size: row.size,
    data: new Blob([row.data], { type: row.mime_type })
  };
}

/**
 * Helpers
 */
function __getDateTimeMinutesAfter(minutes) {
  return new Date(new Date().getTime() + minutes * 60000).toISOString();
}
