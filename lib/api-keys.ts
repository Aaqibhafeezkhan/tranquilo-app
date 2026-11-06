// API keys for the keyed tier of /api/items (served at /v1/items). A key is
// stored only as a SHA-256 hash; see sql/062_api_keys.sql.
//
// The keyed tier fails closed: if the database cannot confirm a key or its
// budget, the request is refused rather than served unmetered.

import { createHash, randomBytes } from "node:crypto";
import { TRANQUILO_CONFIG } from "./config.generated.ts";
import type { QuerySql } from "./img-store.ts";
import { ACQUIRE_SQL } from "./items-rate-limit.ts";

export const KEY_PREFIX = "tq_live_";
const KEY_BYTES = 32;

export type KeyTier = "community" | "partner" | "internal";

export interface KeyAuth {
  keyId: number;
  tier: KeyTier;
}

export interface KeyLimits {
  capacity: number;
  refill_per_sec: number;
}

interface KeyResponse {
  statusCode: number;
  setHeader(name: string, value: string): unknown;
  json(body: unknown): unknown;
}

export function generateApiKey(): string {
  return KEY_PREFIX + randomBytes(KEY_BYTES).toString("base64url");
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function bearerToken(header: string | undefined): string | null {
  if (typeof header !== "string") return null;
  const match = /^Bearer +(\S+)$/.exec(header);
  return match ? match[1] : null;
}

export function tierLimits(tier: KeyTier): KeyLimits {
  return {
    community: TRANQUILO_CONFIG.api_tier_community,
    partner: TRANQUILO_CONFIG.api_tier_partner,
    internal: TRANQUILO_CONFIG.api_tier_internal,
  }[tier];
}

export async function authenticateKey(
  sql: QuerySql,
  header: string | undefined,
): Promise<KeyAuth | null> {
  const token = bearerToken(header);
  if (!token) return null;
  const rows = (await sql.query(
    "SELECT id, tier FROM api_keys WHERE key_hash = $1 AND status = 'active'",
    [hashApiKey(token)],
  )) as { id: string | number; tier: KeyTier }[];
  if (!rows.length) return null;
  return { keyId: Number(rows[0].id), tier: rows[0].tier };
}

// True when the response has been sent and the caller must return.
export async function keyBudgetOrRespond(
  sql: QuerySql,
  keyId: number,
  res: KeyResponse,
  cost: number,
  limits: KeyLimits,
): Promise<boolean> {
  const charge = Math.min(cost, limits.capacity);
  try {
    const rows = (await sql.query(ACQUIRE_SQL, [
      `key:${keyId}`,
      charge,
      limits.capacity,
      limits.refill_per_sec,
    ])) as unknown[];
    if (rows.length) return false;
  } catch (_err) {
    res.statusCode = 503;
    res.setHeader("Retry-After", "5");
    res.json({ error: "Quota service unavailable" });
    return true;
  }
  const retryAfter = Math.max(1, Math.ceil(charge / limits.refill_per_sec));
  res.statusCode = 429;
  res.setHeader("Retry-After", String(retryAfter));
  res.json({ error: "Too many requests", retryAfter });
  return true;
}

const USAGE_SQL =
  "INSERT INTO api_usage (key_id, day, shape, requests, rows_requested, denied) " +
  "VALUES ($1, (now() AT TIME ZONE 'UTC')::date, $2, 1, $3, $4) " +
  "ON CONFLICT (key_id, day, shape) DO UPDATE SET " +
  "  requests = api_usage.requests + 1, " +
  "  rows_requested = api_usage.rows_requested + $3, " +
  "  denied = api_usage.denied + $4";

export async function recordKeyUsage(
  sql: QuerySql,
  keyId: number,
  shape: string,
  rows: number,
  denied: boolean,
): Promise<void> {
  try {
    await sql.query(USAGE_SQL, [keyId, shape, rows, denied ? 1 : 0]);
  } catch (_err) {
    // Counting is best effort; never fail the request over it.
  }
}

const TIERS: readonly KeyTier[] = ["community", "partner", "internal"];
const PREFIX_LENGTH = KEY_PREFIX.length + 4;

// The plaintext key is in the return value and nowhere else: only its hash
// and a short prefix are stored.
export async function issueApiKey(
  sql: QuerySql,
  input: { email: string; tier: KeyTier; note?: string },
): Promise<{ id: number; key: string; prefix: string }> {
  if (!TIERS.includes(input.tier)) {
    throw new Error(`Unknown tier "${input.tier}" (use ${TIERS.join(", ")})`);
  }
  const key = generateApiKey();
  const prefix = key.slice(0, PREFIX_LENGTH);
  const rows = (await sql.query(
    "INSERT INTO api_keys (key_hash, key_prefix, owner_email, tier, note) " +
      "VALUES ($1, $2, $3, $4, $5) RETURNING id",
    [hashApiKey(key), prefix, input.email, input.tier, input.note ?? null],
  )) as { id: string | number }[];
  return { id: Number(rows[0].id), key, prefix };
}

// Returns how many active keys were revoked.
export async function revokeApiKey(
  sql: QuerySql,
  prefix: string,
): Promise<number> {
  const rows = (await sql.query(
    "UPDATE api_keys SET status = 'revoked', revoked_at = now() " +
      "WHERE key_prefix = $1 AND status = 'active' RETURNING id",
    [prefix],
  )) as unknown[];
  return rows.length;
}
