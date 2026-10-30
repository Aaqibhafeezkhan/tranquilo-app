-- Suggest and "did you mean" in a requested locale. items_vocab and
-- items_vocab_words stay the source-language vocabulary; these hold the
-- reviewed translations (term_translations) of the mediums and tags that
-- vocabulary offers, with the same normalised key, rank and item count.
--
-- A locale suggestion query reads both, hiding a source medium or tag that
-- has a reviewed translation so one idea is not offered twice.
--
-- Rebuilt by refresh_items_vocab_locale(locale) after terms are approved
-- and nightly. The live-item condition below MUST match
-- LIVE_ITEMS_PREDICATE in lib/items-sql.ts (tests/items-vocab-locale-api
-- checks it), and the ranks match VOCAB_RANK in lib/items-vocab.ts.

CREATE TABLE IF NOT EXISTS items_vocab_locale (
  locale TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  type TEXT NOT NULL,
  rank SMALLINT NOT NULL,
  item_count INTEGER NOT NULL,
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (locale, key)
);

CREATE INDEX IF NOT EXISTS items_vocab_locale_key_trgm_idx
  ON items_vocab_locale USING GIN (key gin_trgm_ops);

CREATE TABLE IF NOT EXISTS items_vocab_locale_words (
  locale TEXT NOT NULL,
  word TEXT NOT NULL,
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (locale, word)
);

CREATE INDEX IF NOT EXISTS items_vocab_locale_words_trgm_idx
  ON items_vocab_locale_words USING GIN (word gin_trgm_ops);

CREATE OR REPLACE FUNCTION refresh_items_vocab_locale(loc TEXT)
  RETURNS INTEGER
  LANGUAGE plpgsql
AS $$
DECLARE
  refreshed INTEGER;
BEGIN
  WITH live AS (
    SELECT medium, tags FROM items
     WHERE review_status NOT IN ('quarantined', 'rejected', 'delisted')
       AND category != 'Photography'
  ), vals AS (
    SELECT 'medium'::text AS field, medium AS v FROM live WHERE medium IS NOT NULL
    UNION ALL
    SELECT 'tags', btrim(t)
      FROM live, unnest(string_to_array(tags, ',')) AS t
     WHERE tags IS NOT NULL
  ), counted AS (
    SELECT tt.field, tt.text, count(*)::int AS n
      FROM vals
      JOIN term_translations tt
        ON tt.field = vals.field
       AND tt.locale = loc
       AND tt.source_key = lower(regexp_replace(btrim(vals.v), '\s+', ' ', 'g'))
     GROUP BY tt.field, tt.text
  ), ranked AS (
    SELECT immutable_unaccent(lower(text)) AS key, text AS value,
           CASE field WHEN 'medium' THEN 'Medium' ELSE 'Tag' END AS type,
           CASE field WHEN 'medium' THEN 6 ELSE 7 END AS rank,
           n
      FROM counted
  ), upserted AS (
    INSERT INTO items_vocab_locale (locale, key, value, type, rank, item_count, refreshed_at)
    SELECT loc, key,
           (array_agg(value ORDER BY rank, value))[1],
           (array_agg(type ORDER BY rank, value))[1],
           min(rank)::smallint,
           sum(n)::int,
           now()
      FROM ranked
     GROUP BY key
    ON CONFLICT (locale, key) DO UPDATE SET
      value = EXCLUDED.value, type = EXCLUDED.type, rank = EXCLUDED.rank,
      item_count = EXCLUDED.item_count, refreshed_at = EXCLUDED.refreshed_at
    RETURNING 1
  )
  SELECT count(*) INTO refreshed FROM upserted;

  DELETE FROM items_vocab_locale WHERE locale = loc AND refreshed_at < now();

  INSERT INTO items_vocab_locale_words (locale, word, refreshed_at)
  SELECT DISTINCT loc, w, now()
    FROM items_vocab_locale,
         unnest(regexp_split_to_array(key, '[^a-z0-9]+')) AS w
   WHERE locale = loc AND length(w) >= 3
  ON CONFLICT (locale, word) DO UPDATE SET refreshed_at = EXCLUDED.refreshed_at;

  DELETE FROM items_vocab_locale_words WHERE locale = loc AND refreshed_at < now();
  RETURN refreshed;
END;
$$;
