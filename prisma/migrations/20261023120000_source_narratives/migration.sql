-- Mirrors sql/048_source_narratives.sql: museum-written text about an item,
-- a refreshable working copy. quotable is false for book extracts.
CREATE TABLE IF NOT EXISTS source_narratives (
  item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  source_url TEXT,
  license TEXT NOT NULL,
  language TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  footnotes JSONB NOT NULL DEFAULT '[]'::jsonb,
  author TEXT,
  publication_title TEXT,
  publisher TEXT,
  publication_year INTEGER,
  pages TEXT,
  acquisition_url TEXT,
  quotable BOOLEAN GENERATED ALWAYS AS (publication_title IS NULL) STORED,
  content_hash TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
