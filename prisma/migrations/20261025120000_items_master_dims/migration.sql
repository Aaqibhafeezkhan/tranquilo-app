-- Mirrors sql/049_items_master_dims.sql.
ALTER TABLE items ADD COLUMN IF NOT EXISTS master_width INT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS master_height INT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS master_dims_checked_at TIMESTAMPTZ;
