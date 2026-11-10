-- items.external_ids and items.source_meta: two JSON objects for what an
-- institution or authority file says about an item beyond the typed columns.
--
-- external_ids names the item in other systems, keyed by system, for example
-- {"ulan": "500115", "wikidata": "Q5598", "accession": "1937.1.1"}. An item's
-- own id stays items.id.
-- source_meta holds captured source facts that are not yet filtered or sold:
-- date range, dimensions, a rights-statement URI, original-script title.
--
-- Both are NULL until captured, and a value MUST be a JSON object. A field
-- moves to a typed column once something filters or indexes on it.
--
-- Neither column is served, so neither moves updated_at. The same goes for
-- contributors, which no API shape serves. Remove a column from the list
-- below in the migration that starts serving it. Idempotent. This file
-- replaces 063's function, so after re-running 063, run this file again.

ALTER TABLE items ADD COLUMN IF NOT EXISTS external_ids JSONB
  CHECK (jsonb_typeof(external_ids) = 'object');
ALTER TABLE items ADD COLUMN IF NOT EXISTS source_meta JSONB
  CHECK (jsonb_typeof(source_meta) = 'object');

CREATE OR REPLACE FUNCTION items_set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  bookkeeping CONSTANT text[] := ARRAY[
    'updated_at', 'shuffle_key', 'search_text', 'harmonized_at', 'rules_version',
    'source_verified_at', 'review_flags', 'human_reviewed_at',
    'master_dims_checked_at', 'accent_color_status', 'phash', 'curator_boost',
    'vibe_note', 'contributors', 'external_ids', 'source_meta'
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

-- Verify:
--   SELECT column_name, data_type FROM information_schema.columns
--     WHERE table_name = 'items' AND column_name IN ('external_ids', 'source_meta');  -- 2 jsonb rows
