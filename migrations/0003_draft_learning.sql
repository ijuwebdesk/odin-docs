-- Learning from the replies the team actually sends: how much of each AI
-- draft survived, the facts those replies taught us, and the internal
-- playbook (SUPPORT.md, curated) the drafter reads. Epoch milliseconds.

-- The draft exactly as the AI wrote it. `draft` is overwritten as the admin types.
ALTER TABLE tickets ADD COLUMN draft_original TEXT;

-- On sent ('out') messages: the AI draft that was on screen, and how much of it
-- made it into what was sent (0..1, word-pair overlap). NULL = no draft to compare.
ALTER TABLE ticket_messages ADD COLUMN ai_draft TEXT;
ALTER TABLE ticket_messages ADD COLUMN draft_match REAL;

-- Facts the drafter should know. The AI suggests them from sent replies; an
-- admin approves, edits or dismisses each. `npm run playbook:sync` copies
-- approved ones into SUPPORT.md and marks them folded.
CREATE TABLE knowledge (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fact TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'internal',  -- 'internal' (ticket drafts only) | 'public' (also the help-site chat)
  status TEXT NOT NULL DEFAULT 'suggested',   -- 'suggested' | 'approved' | 'dismissed' | 'folded'
  ticket_id INTEGER REFERENCES tickets (id),  -- the reply it was learned from; NULL if added by hand
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  folded_at INTEGER
);
CREATE INDEX knowledge_status ON knowledge (status, created_at);

-- Small key/value store. 'playbook' holds the curated SUPPORT.md. It lives
-- here, not in the repo, because the docs repo is public.
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
