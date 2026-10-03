-- "Was this page helpful?" votes at the end of each docs article, with an
-- optional comment saying what was missing. Timestamps are epoch milliseconds.

CREATE TABLE article_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page TEXT NOT NULL,             -- docs path, e.g. /features/memory/
  helpful INTEGER NOT NULL,       -- 1 = yes, 0 = no
  comment TEXT,                   -- what was missing or wrong (usually after a "no")
  ip_hash TEXT NOT NULL,          -- salted, never the raw IP; also guards comment edits
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX article_feedback_page ON article_feedback (page, created_at);
CREATE INDEX article_feedback_created ON article_feedback (created_at);
