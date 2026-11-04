CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT NOT NULL,
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO campaigns (title, description, status) VALUES
  ('ELEVATE X SWEETOPIA', 'Help promote our upcoming collaboration.', 'Open'),
  ('Example Campus Event', 'A sample campaign for testing our app.', 'Closed'),
  ('Micah''s Backpack X Crumbl Cookie', 'Help elementary school kids by buying a cookie!', 'Closed');