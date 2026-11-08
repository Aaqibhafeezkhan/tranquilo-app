-- items.updated_at: when what the API serves for an item last changed. It is
-- the change marker the keyed listing (/v1/items?shape=listing) pages on.
--
-- A BEFORE UPDATE trigger maintains it, so every writer (ingestion, rechecks,
-- review tools, one-off scripts) is covered without changing any of them. It
-- moves for any change to the row except the pipeline bookkeeping columns
-- listed in the function: a feed reshuffle or a rules re-run rewrites those on
-- most rows without changing the item. A column added later counts as content
-- until it is added to that list. An UPDATE that sets updated_at itself keeps
-- the value it sets.
--
-- Existing rows are backfilled to created_at. Idempotent.

ALTER TABLE items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE items SET updated_at = COALESCE(created_at, now()) WHERE updated_at IS NULL;

ALTER TABLE items ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE items ALTER COLUMN updated_at SET NOT NULL;

CREATE OR REPLACE FUNCTION items_set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  bookkeeping CONSTANT text[] := ARRAY[
    'updated_at', 'shuffle_key', 'search_text', 'harmonized_at', 'rules_version',
    'source_verified_at', 'review_flags', 'human_reviewed_at',
    'master_dims_checked_at', 'accent_color_status', 'phash', 'curator_boost',
    'vibe_note'
  ];
BEGIN
  IF NEW.updated_at IS DISTINCT FROM OLD.updated_at THEN
    RETURN NEW;
  END IF;
  IF (to_jsonb(NEW) - bookkeeping) IS DISTINCT FROM (to_jsonb(OLD) - bookkeeping) THEN
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS items_set_updated_at ON items;
CREATE TRIGGER items_set_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION items_set_updated_at();

CREATE INDEX IF NOT EXISTS items_updated_at_idx ON items (updated_at, id);

-- Verify:
--   SELECT count(*) FROM items WHERE updated_at IS NULL;  -- 0
--   EXPLAIN SELECT id FROM items WHERE updated_at > now() - interval '1 day'
--     ORDER BY updated_at, id LIMIT 100;  -- index scan on items_updated_at_idx
