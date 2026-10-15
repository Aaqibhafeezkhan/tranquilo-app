-- Add place_of_origin to search_text, the column server-side search (?q=)
-- matches against.
--
-- Many anonymous objects carry no artist and no bio, so their place of
-- production is the only geographic word in the record. Before this, a
-- search for "Minas Gerais" or "Brasil" could not find a Minas Gerais
-- santo de roca at all, while a painting by a named Brazilian artist was
-- findable through its bio ("Brazilian, 1853-1929").
--
-- SET EXPRESSION (PostgreSQL 17+) changes the generated column in place:
-- the table is rewritten and its indexes, including the trigram index from
-- 005_items_search.sql, are rebuilt. The rewrite takes an exclusive lock
-- for its duration. Re-running this file is safe -- it sets the same
-- expression again.
--
-- The field list must match matchesQuery() in src/logic/logic.ts; this adds
-- place_of_origin to both. The existing order is kept and the new field
-- appended, so every substring that matched before still matches.

ALTER TABLE items ALTER COLUMN search_text SET EXPRESSION AS (
  immutable_unaccent(lower(
    coalesce(title, '') || ' ' ||
    coalesce(artist, '') || ' ' ||
    coalesce(category, '') || ' ' ||
    coalesce(medium, '') || ' ' ||
    coalesce(tags, '') || ' ' ||
    coalesce(region_primary, '') || ' ' ||
    coalesce(timeframe, '') || ' ' ||
    coalesce(media_type, '') || ' ' ||
    coalesce(palette, '') || ' ' ||
    coalesce(date, '') || ' ' ||
    coalesce(bio, '') || ' ' ||
    coalesce(place_of_origin, '')
  ))
);


-- ===========================================================================
-- Verify (optional)
-- ===========================================================================
-- An item findable only by its place:
--   SELECT count(*) FROM items
--    WHERE search_text LIKE '%' || immutable_unaccent(lower('minas gerais')) || '%'
--      AND review_status NOT IN ('quarantined', 'rejected', 'delisted');
--
-- The trigram index is still used (expect a Bitmap Index Scan on
-- items_search_text_trgm_idx, not a Seq Scan):
--   EXPLAIN SELECT id FROM items
--    WHERE search_text LIKE '%' || immutable_unaccent(lower('minas gerais')) || '%';
--
-- Then, from the repo:
--   bun scripts/verify_feed_fixtures.mts
