-- The earliest artist string held for the row, before canonicalisation;
-- normally the source's own. Set once, never overwritten; NULL if unknown.
-- Internal only: no API response includes it.
-- Run by hand in Neon's SQL editor. Safe to re-run.
ALTER TABLE items ADD COLUMN IF NOT EXISTS artist_raw TEXT;

-- Verify:
--   SELECT count(*) FILTER (WHERE artist_raw IS NOT NULL) AS kept,
--          count(*) FILTER (WHERE artist_raw IS DISTINCT FROM artist) AS rewritten
--     FROM items;
