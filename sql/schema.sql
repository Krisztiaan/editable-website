pragma journal_mode = WAL;

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  expires TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pages (
  page_id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- versioned pages (draft/prod pointers)
CREATE TABLE IF NOT EXISTS page_versions (
  version_id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS page_pointers (
  page_id TEXT NOT NULL,
  pointer TEXT NOT NULL,
  version_id TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  PRIMARY KEY (page_id, pointer)
);

CREATE TABLE IF NOT EXISTS page_pointer_events (
  event_id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  pointer TEXT NOT NULL,
  from_version_id TEXT DEFAULT NULL,
  to_version_id TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  changed_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS page_locks (
  page_id TEXT PRIMARY KEY,
  locked_by TEXT NOT NULL,
  locked_by_name TEXT NOT NULL,
  locked_until TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- counters (for view counts and everything you want to track anonymously)
CREATE TABLE IF NOT EXISTS counters (
  counter_id TEXT PRIMARY KEY,
  count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
  asset_id TEXT PRIMARY KEY,
  mime_type TEXT NOT NULL,
  updated_at TEXT DEFAULT NULL,
  size INTEGER NOT NULL,
  data BLOB NOT NULL
);

CREATE TABLE IF NOT EXISTS articles (
  article_id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  teaser TEXT NOT NULL,
  content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  published_at DATETIME,
  updated_at DATETIME
);
COMMIT;
