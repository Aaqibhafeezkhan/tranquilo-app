-- Value-level translations: one reviewed translation of a catalogue term
-- (a medium, culture, place, nationality or tag) serves every item that
-- uses it, instead of one translations row per item and field. Read by
-- lib/translations.ts for ?locale=.
--
-- Only human-reviewed terms are ever inserted, so a row here is always
-- servable. An item-level row in translations for the same field wins.
--
-- source_key is the term lowercased with whitespace collapsed (the same
-- folding lib/translations.ts applies to an item's value); source_text is
-- the spelling that was reviewed, so serving can follow an item's own
-- capitalization. For tags, a term is one comma-separated token.

CREATE TABLE IF NOT EXISTS term_translations (
  field TEXT NOT NULL
    CHECK (field IN ('medium', 'culture', 'place_of_origin', 'artist_nationality', 'tags')),
  locale TEXT NOT NULL,
  source_key TEXT NOT NULL,
  source_text TEXT NOT NULL,
  text TEXT NOT NULL CHECK (btrim(text) <> ''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (field, locale, source_key)
);
