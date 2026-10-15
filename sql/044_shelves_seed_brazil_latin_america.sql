-- Two hand-picked Discover shelves: Brazil, and Latin America more widely.
-- Run after 021_shelves.sql/022_shelves_seed.sql. Idempotent via ON
-- CONFLICT, same as 022.
--
-- Hero shelves rather than rule shelves: the region vocabulary has a single
-- "Americas" bucket, so no { field: value } filter can select Latin America
-- yet. Every id below was checked live (review_status 'ok', not
-- Photography, unambiguous native_id) when this file was written.
--
-- Mixed sources on purpose. Brazil draws on the Brazilian museum
-- collections ingested through Tainacan (MARGS, Museu do Ouro, Museu
-- Regional Casa dos Ottoni) alongside 19th-century Brazilian painting from
-- Wikimedia Commons. Latin America spans Mesoamerica, the Andes, Central
-- America and Brazil, from Olmec sculpture to Posada's broadsides.
-- Same-maker items are kept apart in the authored order.
INSERT INTO shelves (id, title, type, position, item_ids, filter, min_items) VALUES
  ('brazil', 'Feito no Brasil', 'hero', 7,
   '["margs:280927",
     "File:Almeida Júnior - Caipira Cutting Tobacco - Google Art Project.jpg",
     "museudoouro:6019",
     "File:Belmiro de Almeida - Bom Tempo ou Idílio Campestre - 1893.jpg",
     "margs:282397",
     "File:Agostinho da Mota - Mamão e melancia, 1860.jpg",
     "casadosottoni:36936",
     "File:Arthur Timótheo da Costa - No Ateliê.jpg",
     "margs:434563",
     "File:Nicola Facchinetti - Lagoa Rodrigo de Freitas, Rio de Janeiro, ca. 1884.jpg",
     "File:Félix-Émile Taunay - O caçador e a onça.jpg",
     "File:Eliseu Visconti - Paisagem com figura.jpg"]'::jsonb,
   NULL, NULL),
  ('latin-america', 'Across Latin America', 'hero', 8,
   '[170118, 717602, 128191, 314528, 130653,
     "File:Almeida Júnior - Apertando o Lombilho, 1895.jpg",
     159277, 387395, 155508, "casadosottoni:35772", 162912, 354174, 308536]'::jsonb,
   NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  type = EXCLUDED.type,
  position = EXCLUDED.position,
  item_ids = EXCLUDED.item_ids,
  filter = EXCLUDED.filter,
  min_items = EXCLUDED.min_items;
