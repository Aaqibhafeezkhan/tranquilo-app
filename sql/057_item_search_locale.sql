-- Search in a requested locale. items.search_text holds the source text;
-- item_search_locale adds, per item and locale, the reviewed translations
-- (term_translations) of the medium, tags and place of origin that
-- search_text covers, folded the same way (lowercase, unaccented).
--
-- A ?q= with ?locale= matches search_text OR this table's extra_text, so
-- source-language names (artists, original titles) and English keep
-- matching, and an item missing a row here (new since the last refresh)
-- is still found by its source text.
--
-- Rebuilt by refresh_item_search_locale(locale) after terms are approved
-- and nightly. Rows for items no longer matching any term are removed.
-- Rows are not limited to live items; the query applies the live predicate.

CREATE TABLE IF NOT EXISTS item_search_locale (
  item_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  extra_text TEXT NOT NULL,
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (item_id, locale)
);

CREATE INDEX IF NOT EXISTS item_search_locale_extra_trgm_idx
  ON item_search_locale USING GIN (extra_text gin_trgm_ops);

-- Matches an item's value to a term the way lib/translations.ts termKey()
-- does: trimmed, whitespace collapsed, lowercased. Tags match per token.
CREATE OR REPLACE FUNCTION refresh_item_search_locale(loc TEXT)
  RETURNS INTEGER
  LANGUAGE plpgsql
AS $$
DECLARE
  refreshed INTEGER;
BEGIN
  WITH vals AS (
    SELECT id, 'medium'::text AS field, medium AS v
      FROM items WHERE medium IS NOT NULL
    UNION ALL
    SELECT id, 'place_of_origin', place_of_origin
      FROM items WHERE place_of_origin IS NOT NULL
    UNION ALL
    SELECT id, 'tags', btrim(t)
      FROM items, unnest(string_to_array(tags, ',')) AS t
     WHERE tags IS NOT NULL
  ), fresh AS (
    SELECT vals.id AS item_id,
           immutable_unaccent(lower(string_agg(DISTINCT tt.text, ' '))) AS extra_text
      FROM vals
      JOIN term_translations tt
        ON tt.field = vals.field
       AND tt.locale = loc
       AND tt.source_key = lower(regexp_replace(btrim(vals.v), '\s+', ' ', 'g'))
     GROUP BY vals.id
  ), upserted AS (
    INSERT INTO item_search_locale (item_id, locale, extra_text, refreshed_at)
    SELECT item_id, loc, extra_text, now() FROM fresh
    ON CONFLICT (item_id, locale) DO UPDATE
      SET extra_text = EXCLUDED.extra_text, refreshed_at = EXCLUDED.refreshed_at
    RETURNING 1
  )
  SELECT count(*) INTO refreshed FROM upserted;

  DELETE FROM item_search_locale WHERE locale = loc AND refreshed_at < now();
  RETURN refreshed;
END;
$$;
