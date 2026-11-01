-- Files customers attach to support email. The bytes live in R2 (bucket
-- silk-support-attachments, stored there by the mailer Worker); this is the
-- index. Timestamps are epoch milliseconds.

CREATE TABLE attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES tickets (id),
  message_id INTEGER REFERENCES ticket_messages (id),  -- NULL = came with the ticket's first message
  r2_key TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  inline INTEGER NOT NULL DEFAULT 0,  -- embedded in the email body (often a signature logo)
  created_at INTEGER NOT NULL
);
CREATE INDEX attachments_ticket ON attachments (ticket_id, id);
