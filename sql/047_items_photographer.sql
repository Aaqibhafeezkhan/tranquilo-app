-- Who photographed the work, when that's someone other than its maker: the
-- contributor who photographed a painting for Wikimedia Commons, a
-- photographer a museum credits for an object photograph. Credited in its own
-- detail-page row ("Photographer"), apart from the artist and from `credit`,
-- which holds provenance. NULL for most rows; the row only shows when set.
--
-- Run once by hand in Neon's web SQL editor, same convention as every other
-- file here, before deploying the API that selects it. Safe to re-run.
ALTER TABLE items ADD COLUMN IF NOT EXISTS photographer TEXT;

-- No index: read with the rest of a row, never filtered on.

-- Verify:
--   SELECT count(*) FILTER (WHERE photographer IS NOT NULL) FROM items;
