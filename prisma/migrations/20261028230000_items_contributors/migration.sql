-- Structured credits; NULL when none recorded.
ALTER TABLE items ADD COLUMN IF NOT EXISTS contributors JSONB;
