-- Removes storylines built on photographs, and their item links.
-- Idempotent: safe to re-run.

UPDATE items
SET storyline_ids = array_remove(array_remove(array_remove(array_remove(
  storyline_ids,
  'cubism-before-and-after'),
  'castiglione-pierson'),
  'chess-two-branches'),
  'why-they-went')
WHERE storyline_ids && ARRAY[
  'cubism-before-and-after',
  'castiglione-pierson',
  'chess-two-branches',
  'why-they-went'
];

DELETE FROM storylines
WHERE id IN (
  'cubism-before-and-after',
  'castiglione-pierson',
  'chess-two-branches',
  'why-they-went'
);
