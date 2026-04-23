CREATE TABLE IF NOT EXISTS transactional_email_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_kind TEXT NOT NULL CHECK (email_kind IN ('welcome')),
  subscriber_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  source_page TEXT,
  provider_message_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactional_email_created
  ON transactional_email_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactional_email_subscriber
  ON transactional_email_log(subscriber_email, created_at DESC);
