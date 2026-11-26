-- Browsers whose visits are left out of the statistics: the site owner's own
-- devices. Their events stay in the events table; the reports skip them.
CREATE TABLE IF NOT EXISTS excluded_visitors (
  visitor_id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('owner-link', 'dashboard')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
