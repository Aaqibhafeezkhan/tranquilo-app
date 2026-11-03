// Pseudonymous visitor key for rate-limit buckets and denial counters, so no
// raw IP address is stored. A keyed hash of the address and the UTC date:
// stable within a day (a bucket keeps counting), unlinkable across days, and
// not reversible by trying every IPv4 address without the key.
//
// The key is derived from ITEMS_CURSOR_SECRET under its own label, so
// rotating that secret also rotates every visitor key. Without a secret there
// is nothing safe to hash with, so callers get null and skip the budget.

import { createHmac } from "node:crypto";

const KEY_LABEL = "visitor-hash-v1";
const KEY_LENGTH = 16;

export function visitorKey(
  ip: string | null,
  secret: string | undefined = process.env.ITEMS_CURSOR_SECRET,
  now: Date = new Date(),
): string | null {
  if (!ip || !secret) return null;
  const key = createHmac("sha256", secret).update(KEY_LABEL).digest();
  const day = now.toISOString().slice(0, 10);
  return createHmac("sha256", key)
    .update(`${day}|${ip}`)
    .digest("hex")
    .slice(0, KEY_LENGTH);
}
