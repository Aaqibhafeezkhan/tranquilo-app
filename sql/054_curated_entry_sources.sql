-- Names the source of each storyline chapter and set-of-works member whose
-- native id belongs to exactly one source, so a later ingest that reuses the
-- id in another source cannot change what the entry resolves to. Entries
-- whose id is already shared are set by hand below. Re-runnable: entries that
-- already name a source are left alone.

UPDATE storylines s
SET items = (
  SELECT jsonb_agg(
    CASE WHEN e ? 'source' THEN e
    ELSE e || jsonb_strip_nulls(jsonb_build_object('source', COALESCE(
      CASE WHEN s.id = 'rubens-workshop' AND e->>'id' = '437534' THEN 'met' END,
      (SELECT min(i.source) FROM items i
        WHERE i.native_id = e->>'id' HAVING count(DISTINCT i.source) = 1)
    ))) END
    ORDER BY ord)
  FROM jsonb_array_elements(s.items) WITH ORDINALITY AS t(e, ord)
);

UPDATE set_of_works w
SET items = (
  SELECT jsonb_agg(
    CASE WHEN e ? 'source' THEN e
    ELSE e || jsonb_strip_nulls(jsonb_build_object('source',
      (SELECT min(i.source) FROM items i
        WHERE i.native_id = e->>'id' HAVING count(DISTINCT i.source) = 1)
    )) END
    ORDER BY ord)
  FROM jsonb_array_elements(w.items) WITH ORDINALITY AS t(e, ord)
);
