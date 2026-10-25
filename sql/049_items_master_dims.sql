-- Pixel size of full_img, the source's largest published image.
-- NULL width with non-NULL checked_at means the image was unreadable.
-- Run by hand in Neon's SQL editor. Safe to re-run.
ALTER TABLE items ADD COLUMN IF NOT EXISTS master_width INT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS master_height INT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS master_dims_checked_at TIMESTAMPTZ;

-- Verify:
--   SELECT source, count(*) FILTER (WHERE master_width IS NOT NULL) AS measured
--     FROM items GROUP BY source;
