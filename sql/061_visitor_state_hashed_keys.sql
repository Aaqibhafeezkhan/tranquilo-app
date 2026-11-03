-- visitor_fetch_state used to be keyed on the visitor's raw IP address. Both
-- budgets now key on a daily hash ("items:<hash>", "img:<hash>"; see
-- lib/visitor-hash.ts), so any row that is not in that form holds an address
-- and is removed. Idempotent.

DELETE FROM visitor_fetch_state
 WHERE ip !~ '^(items|img):[0-9a-f]{16}$';

-- Verify:
--   SELECT count(*) FROM visitor_fetch_state;
--   SELECT ip FROM visitor_fetch_state ORDER BY updated_at DESC LIMIT 5;
