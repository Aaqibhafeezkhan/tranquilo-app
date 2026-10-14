-- When this row was last re-checked against its source institution's live
-- API. Some sources' API terms limit how long fetched data may be held
-- without being refreshed, so a periodic re-verification pass (in the
-- ingestion repo, python/scripts/recheck_source_records.py) re-fetches each
-- due row, compares it to what is stored, and stamps this column. NULL means
-- never re-checked -- the pass falls back to created_at for age.
--
-- A record the source has withdrawn, or that no longer clears its license
-- gate, is moved to review_status = 'delisted' by the same pass (see
-- sql/031_items_delisted_state.sql); the stamp is still written, since the
-- check itself succeeded.
--
-- Run once by hand in Neon's web SQL editor, same convention as every other
-- file here. Safe to re-run (ADD COLUMN IF NOT EXISTS).
ALTER TABLE items ADD COLUMN IF NOT EXISTS source_verified_at TIMESTAMPTZ;

-- No index: the pass filters by source first, which items_source_native_id_idx
-- already serves, and each source it runs against is small.

-- Verify:
--   SELECT source, count(*) FILTER (WHERE source_verified_at IS NULL) AS never,
--          min(COALESCE(source_verified_at, created_at)) AS oldest
--     FROM items
--    GROUP BY source;
