// Revokes an API key by its prefix (the first characters shown when it was
// issued). The row and its usage counters are kept. Needs DATABASE_URL.
//
// Run:  bun scripts/revoke-api-key.mts <key-prefix>
import { revokeAccessToken } from "../lib/api-keys.ts";
import { getSql } from "../lib/db.ts";

const [prefix] = process.argv.slice(2);
if (!prefix) {
  console.error("usage: revoke-api-key.mts <key-prefix>");
  process.exit(1);
}
const sql = getSql();
if (!sql) throw new Error("DATABASE_URL is not set");

const revoked = await revokeAccessToken(sql, prefix);
console.log(
  revoked ? `Revoked ${revoked} key.` : "No active key with that prefix.",
);
