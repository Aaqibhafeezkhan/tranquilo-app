-- The artist string as the source delivered it, before canonicalisation.
-- Set once and never overwritten; NULL where the original is unknown.
-- Internal only: no API response includes it.
-- Run by hand in Neon's SQL editor. Safe to re-run.
ALTER TABLE items ADD COLUMN IF NOT EXISTS artist_raw TEXT;

-- Verify:
--   SELECT count(*) FILTER (WHERE artist_raw IS NOT NULL) AS kept,
--          count(*) FILTER (WHERE artist_raw IS DISTINCT FROM artist) AS rewritten
--     FROM items;
