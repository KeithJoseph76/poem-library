-- ============================================================
-- OUR QUIET PLACE — Supabase table setup
-- Run this in your Supabase Studio → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS poems (
    id          SERIAL PRIMARY KEY,
    title       TEXT    NOT NULL,
    dedication  TEXT,
    body        TEXT    NOT NULL,
    tags        TEXT[]  DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Allow anonymous read (public poems for your partner to see)
ALTER TABLE poems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read poems"
    ON poems
    FOR SELECT
    USING (true);

-- Allow anonymous insert / update / delete
-- (your admin password is enforced client-side;
--  for a production app you would use a service-role key
--  or a custom auth flow instead.)
CREATE POLICY "anyone can insert poems"
    ON poems
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "anyone can update poems"
    ON poems
    FOR UPDATE
    USING (true);

CREATE POLICY "anyone can delete poems"
    ON poems
    FOR DELETE
    USING (true);