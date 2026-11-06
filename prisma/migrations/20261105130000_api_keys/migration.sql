-- API keys for the keyed tier of /api/items (reached at /v1/items) and a
-- per-day usage counter for each. A key is stored only as a SHA-256 hash; the
-- plaintext is shown once when it is issued (scripts/issue-api-key.mts).
-- `key_prefix` is the first characters of the key, so a key can be told apart
-- in a listing without being recoverable.
--
-- api_usage holds counters, not a request log: no IP, no visitor, no query.
-- Rows older than 13 months are deleted by the prune-visitor-data cron job.
-- Revoking a key keeps its usage rows. Idempotent.

CREATE TABLE IF NOT EXISTS api_keys (
  id           BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key_hash     TEXT        NOT NULL UNIQUE,
  key_prefix   TEXT        NOT NULL,
  owner_email  TEXT        NOT NULL,
  tier         TEXT        NOT NULL CHECK (tier IN ('community', 'partner', 'internal')),
  status       TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS api_usage (
  key_id          BIGINT  NOT NULL REFERENCES api_keys (id),
  day             DATE    NOT NULL,
  shape           TEXT    NOT NULL,
  requests        INTEGER NOT NULL DEFAULT 0,
  rows_requested  BIGINT  NOT NULL DEFAULT 0,
  denied          INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key_id, day, shape)
);

CREATE INDEX IF NOT EXISTS api_usage_day_idx ON api_usage (day);

-- Verify:
--   SELECT id, key_prefix, tier, status, created_at FROM api_keys ORDER BY id;
--   SELECT day, shape, sum(requests) AS requests, sum(denied) AS denied
--     FROM api_usage GROUP BY 1, 2 ORDER BY 1 DESC, 2;
