CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  placement TEXT,
  source_page TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at TEXT,
  unsubscribe_token TEXT NOT NULL UNIQUE,
  notes_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status, updated_at);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'article_click', 'newsletter_signup', 'ui_click')),
  pathname TEXT,
  page_title TEXT,
  referrer TEXT,
  visitor_id TEXT,
  session_id TEXT,
  context TEXT,
  target_path TEXT,
  target_text TEXT,
  x_ratio REAL,
  y_ratio REAL,
  meta_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_type_created ON events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_events_path_created ON events(pathname, created_at);
CREATE INDEX IF NOT EXISTS idx_events_target_created ON events(target_path, created_at);

CREATE TABLE IF NOT EXISTS newsletter_dispatches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feed_guid TEXT NOT NULL UNIQUE,
  feed_title TEXT NOT NULL,
  clean_title TEXT NOT NULL,
  feed_url TEXT NOT NULL,
  feed_kind TEXT NOT NULL CHECK (feed_kind IN ('new', 'updated')),
  summary TEXT,
  published_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'partial', 'failed')),
  recipient_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_dispatch_status_created ON newsletter_dispatches(status, created_at);

CREATE TABLE IF NOT EXISTS newsletter_delivery_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dispatch_id INTEGER NOT NULL,
  subscriber_email TEXT NOT NULL,
  provider_message_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error TEXT,
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(dispatch_id, subscriber_email),
  FOREIGN KEY(dispatch_id) REFERENCES newsletter_dispatches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_delivery_dispatch_status ON newsletter_delivery_log(dispatch_id, status);
