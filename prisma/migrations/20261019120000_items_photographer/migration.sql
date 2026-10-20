-- Mirrors sql/047_items_photographer.sql: who photographed the work, when
-- that's someone other than its maker. NULL for most rows.
ALTER TABLE items ADD COLUMN IF NOT EXISTS photographer TEXT;
