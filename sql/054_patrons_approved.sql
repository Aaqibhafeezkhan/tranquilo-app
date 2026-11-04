-- A patron is listed on the About page only once someone sets approved = true
-- by hand. Nothing automated writes this column, so Patreon test events and
-- unreviewed members stay off the public page.

ALTER TABLE patrons ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT false;
