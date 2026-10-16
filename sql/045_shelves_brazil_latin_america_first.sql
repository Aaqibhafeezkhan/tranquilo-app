-- Moves the Brazil and Latin America shelves (044) to the top of Discover's
-- mood shelves, directly under Storylines (which renders as its own
-- section). Hero shelves render in position order, so this renumbers every
-- shelf rather than inserting gaps. Idempotent: re-running sets the same
-- positions.
UPDATE shelves SET position = CASE id
  WHEN 'storylines' THEN 0
  WHEN 'brazil' THEN 1
  WHEN 'latin-america' THEN 2
  WHEN 'painted-by-themselves' THEN 3
  WHEN 'pets-in-art' THEN 4
  WHEN 'merry-company' THEN 5
  WHEN 'creature-curiosities' THEN 6
  WHEN 'old-world-portraiture' THEN 7
  WHEN 'birdwatching' THEN 8
  ELSE position
END
WHERE id IN ('storylines', 'brazil', 'latin-america', 'painted-by-themselves',
             'pets-in-art', 'merry-company', 'creature-curiosities',
             'old-world-portraiture', 'birdwatching');
