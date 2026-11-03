-- Denials from the per-visitor budgets on /api/items (lib/items-rate-limit.ts),
-- one row per day, visitor and budget. Counters, not a request log, and no
-- IP: `visitor` is a keyed daily hash (lib/visitor-hash.ts), so a row cannot
-- be traced back to an address and cannot be linked across days.
--
-- Rows older than 30 days are deleted by the prune-visitor-data cron job.

CREATE TABLE IF NOT EXISTS items_budget_events (
  day              DATE        NOT NULL,
  visitor          TEXT        NOT NULL,
  kind             TEXT        NOT NULL,
  denied_requests  INTEGER     NOT NULL DEFAULT 0,
  denied_cost      INTEGER     NOT NULL DEFAULT 0,
  enforced         BOOLEAN     NOT NULL,
  first_seen       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (day, visitor, kind)
);

-- Bucket rows written under `items:<ip>` hold raw addresses; the budget now
-- keys on the daily hash instead.
DELETE FROM visitor_fetch_state WHERE ip LIKE 'items:%';

-- Verify:
--   SELECT day, kind, count(*) AS visitors, sum(denied_requests) AS denied
--     FROM items_budget_events GROUP BY 1, 2 ORDER BY 1 DESC, 2;
