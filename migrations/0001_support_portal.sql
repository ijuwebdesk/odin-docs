-- AI support portal: chat logs, tickets, and a fixed-window rate limiter.
-- Timestamps are unix epoch milliseconds throughout.

CREATE TABLE conversations (
  id TEXT PRIMARY KEY,            -- random UUID, held by the visitor's browser
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  ip_hash TEXT,                   -- salted hash, never the raw IP
  page TEXT,                      -- docs page the chat was opened from, if any
  turns INTEGER NOT NULL DEFAULT 0,
  unanswered INTEGER NOT NULL DEFAULT 0,  -- the AI said the docs don't cover it
  feedback TEXT,                  -- 'up' | 'down', the visitor's latest vote
  ticket_id INTEGER               -- set when the chat was escalated to a human
);
CREATE INDEX conversations_created ON conversations (created_at);

CREATE TABLE chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT NOT NULL REFERENCES conversations (id),
  role TEXT NOT NULL,             -- 'user' | 'assistant'
  content TEXT NOT NULL,
  model TEXT,
  tokens_in INTEGER,
  tokens_out INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX chat_messages_conversation ON chat_messages (conversation_id, id);

CREATE TABLE tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  question TEXT NOT NULL,
  conversation_id TEXT REFERENCES conversations (id),
  status TEXT NOT NULL DEFAULT 'open',    -- 'open' | 'answered' | 'closed'
  draft TEXT,                     -- the AI's proposed reply, editable in the admin
  draft_notes TEXT,               -- the AI's notes to the agent: what to double-check
  draft_status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'ready' | 'failed'
  draft_model TEXT,
  draft_updated_at INTEGER,
  thread_message_id TEXT,         -- Message-ID of our first email, so replies thread
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX tickets_status ON tickets (status, updated_at);

-- Ticket numbers read as SILK-1001 onwards rather than SILK-1.
INSERT INTO sqlite_sequence (name, seq) VALUES ('tickets', 1000);

CREATE TABLE ticket_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES tickets (id),
  direction TEXT NOT NULL,        -- 'in' (customer) | 'out' (us)
  body TEXT NOT NULL,
  author TEXT,                    -- admin email for 'out'
  created_at INTEGER NOT NULL
);
CREATE INDEX ticket_messages_ticket ON ticket_messages (ticket_id, id);

CREATE TABLE rate_limits (
  key TEXT NOT NULL,
  window INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (key, window)
);
