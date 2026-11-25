-- Adds the event types sent after consent: engagement (time and scroll),
-- impression (article cards and figures seen), figure_interact and share.
-- SQLite cannot alter a CHECK constraint, so the table is rebuilt.
CREATE TABLE events_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'article_click', 'newsletter_signup', 'ui_click', 'engagement', 'impression', 'figure_interact', 'share')),
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

INSERT INTO events_new (id, event_type, pathname, page_title, referrer, visitor_id, session_id, context, target_path, target_text, x_ratio, y_ratio, meta_json, created_at)
SELECT id, event_type, pathname, page_title, referrer, visitor_id, session_id, context, target_path, target_text, x_ratio, y_ratio, meta_json, created_at
FROM events;

DROP TABLE events;
ALTER TABLE events_new RENAME TO events;

CREATE INDEX IF NOT EXISTS idx_events_type_created ON events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_events_path_created ON events(pathname, created_at);
CREATE INDEX IF NOT EXISTS idx_events_target_created ON events(target_path, created_at);
CREATE INDEX IF NOT EXISTS idx_events_session_created ON events(session_id, created_at);
