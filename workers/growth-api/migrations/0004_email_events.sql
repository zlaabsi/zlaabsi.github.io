-- What happened to each email after it left: delivered, opened, clicked,
-- bounced, complained. Filled by Resend webhooks; webhook_id makes retries
-- harmless. provider_message_id joins the two delivery logs.
CREATE TABLE IF NOT EXISTS email_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  webhook_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'delivered', 'delivery_delayed', 'opened', 'clicked', 'bounced', 'complained')),
  provider_message_id TEXT,
  recipient TEXT,
  subject TEXT,
  link TEXT,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_events_message ON email_events(provider_message_id, event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_type_time ON email_events(event_type, occurred_at);
