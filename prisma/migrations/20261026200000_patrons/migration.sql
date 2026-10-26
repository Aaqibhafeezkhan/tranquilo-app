-- Patreon members, written by api/webhooks/patreon.ts and
-- scripts/patreon-sync.mts, read at build time by
-- vite-plugins/community-partial.mts for the About page.
--
-- full_name, patron_status and tier_ids mirror Patreon and are overwritten
-- on every event. display_name and anonymous are hand-edited overrides that
-- nothing automated ever writes. A deleted member keeps its row with
-- full_name blanked, so an anonymity request survives a rejoin.

CREATE TABLE IF NOT EXISTS patreon_tiers (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS patrons (
  member_id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  patron_status TEXT,
  tier_ids TEXT[] NOT NULL DEFAULT '{}',
  display_name TEXT,
  anonymous BOOLEAN NOT NULL DEFAULT false,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
