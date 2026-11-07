CREATE TABLE IF NOT EXISTS submissions (
  id SERIAL PRIMARY KEY,
  participation_id INTEGER NOT NULL UNIQUE
    REFERENCES participations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Submitted'
    CHECK (status IN ('Submitted', 'Approved', 'ChangesRequested')),
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);