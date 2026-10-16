-- Three reviewed Sets of works: a Delft flower pyramid catalogued piece by
-- piece, Blooteling's lion etchings after Rubens, and four Philadelphia
-- Sunday Press poster covers. Run after 033_items_set_of_work_id.sql and
-- 034_set_of_works.sql. Idempotent: ON CONFLICT rewrites each set row, and
-- the items UPDATEs set the same value on every run.
--
-- items[].id is the bare native_id (see 034's header). Every id was checked
-- live before this file was written: review_status 'ok' and no other source
-- holds the same native_id. The UPDATEs are still scoped by source, so a
-- later collision can't badge an unrelated item.
--
-- Members are listed in display order. Traits come from each museum's own
-- record (tier dimensions, issue dates) or from what the image shows.
--
-- Cleveland's whole-set record for the lions (2005.266, cleveland:163883)
-- is not a member: it reuses the title plate's image (2005.266.1) and was
-- rejected as a duplicate. The pyramid's whole-object record (2024.27,
-- cleveland:675579) is a member, since its photograph shows the assembled
-- pyramid, not any single part.
INSERT INTO set_of_works (id, title, items) VALUES
  ('set-kocx-flower-pyramid', 'Flower Pyramid',
   '[{"id": "675579", "distinguishing_trait": "The whole pyramid assembled: the base and all six tiers stacked to 95 cm."},
     {"id": "675812", "distinguishing_trait": "The base, 36 cm tall, painted with allegorical figures of Faith, Hope and Love."},
     {"id": "675813", "distinguishing_trait": "First tier, the widest, 28.2 cm across."},
     {"id": "675814", "distinguishing_trait": "Second tier, 26.3 cm across."},
     {"id": "675815", "distinguishing_trait": "Third tier, 22.5 cm across."},
     {"id": "675816", "distinguishing_trait": "Fourth tier, 19.7 cm across."},
     {"id": "675817", "distinguishing_trait": "Fifth tier, 15.8 cm across."},
     {"id": "675818", "distinguishing_trait": "Sixth tier, the top: the narrowest at 12.8 cm across but the tallest at 16.8 cm."}]'::jsonb),
  ('set-blooteling-various-lions', 'Various Lions',
   '[{"id": "163884", "distinguishing_trait": "The title plate, lettered Variae Leonum Icones after Rubens: two lions beside a rock."},
     {"id": "163885", "distinguishing_trait": "Two lions lying down together, one with its head lowered."},
     {"id": "163886", "distinguishing_trait": "Two lions rearing up and snarling at each other."},
     {"id": "163887", "distinguishing_trait": "A lion at the mouth of a cave, a second lion in the shadow behind it."}]'::jsonb),
  ('set-philadelphia-sunday-press', 'Philadelphia Sunday Press',
   '[{"id": "339068", "distinguishing_trait": "29 September 1895: a dancer between two cloaked figures, beneath a ball poster."},
     {"id": "339069", "distinguishing_trait": "6 October 1895: a woman in a red jacket sits on a wall with a rifle while a rabbit watches."},
     {"id": "339070", "distinguishing_trait": "10 November 1895: a woman on horseback talks with a man standing by a bicycle."},
     {"id": "339071", "distinguishing_trait": "12 January 1896: a woman in a red cape at a café table, the only brown cover of the four."}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, items = EXCLUDED.items;

UPDATE items SET set_of_work_id = 'set-kocx-flower-pyramid'
 WHERE source = 'cleveland'
   AND native_id IN ('675579', '675812', '675813', '675814', '675815', '675816', '675817', '675818');

UPDATE items SET set_of_work_id = 'set-blooteling-various-lions'
 WHERE source = 'cleveland'
   AND native_id IN ('163884', '163885', '163886', '163887');

UPDATE items SET set_of_work_id = 'set-philadelphia-sunday-press'
 WHERE source = 'met'
   AND native_id IN ('339068', '339069', '339070', '339071');

-- Verify:
--   SELECT id, title, jsonb_array_length(items) FROM set_of_works ORDER BY id;
--   SELECT set_of_work_id, count(*) FROM items WHERE set_of_work_id IS NOT NULL GROUP BY 1;
