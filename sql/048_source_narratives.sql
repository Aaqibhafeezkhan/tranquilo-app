-- Museum-written text about an item (an essay, a label, a book extract),
-- held as a working copy so captions can be grounded in it and cite it.
-- Not served whole. The ingestion pipeline writes it at ingest time and
-- the source recheck refreshes it, so a row is never older than the
-- source's terms allow; when the text disappears upstream, the row is
-- deleted. Not covered by the items backup: everything here can be fetched
-- again from the source.
--
-- quotable is false whenever the text was first published elsewhere (a
-- book extract): such text MAY ground and be cited, but is never shown on
-- a page. The citation points readers at acquisition_url instead.
--
-- language is the BCP 47 tag of the text as published (e.g. 'en').
--
-- footnotes is an array of {n, text, kind, url?}; kind is 'web' when the
-- note carries a link, 'reference' otherwise.
--
-- Run once by hand in Neon's web SQL editor, same convention as every other
-- file here. Safe to re-run.
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

-- Verify:
--   SELECT source, count(*), count(*) FILTER (WHERE NOT quotable) AS extracts
--   FROM source_narratives GROUP BY source;
