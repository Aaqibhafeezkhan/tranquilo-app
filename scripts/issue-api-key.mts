// Issues an API key for the keyed tier and prints it once; only its hash is
// stored. Needs DATABASE_URL in the environment.
//
// Run:  bun scripts/issue-api-key.mts <owner-email> <community|partner|internal> [note]
import { issueApiKey, type KeyTier } from "../lib/api-keys.ts";
import { getSql } from "../lib/db.ts";

const [email, tier, note] = process.argv.slice(2);
if (!email || !tier) {
  console.error("usage: issue-api-key.mts <owner-email> <tier> [note]");
  process.exit(1);
}
const sql = getSql();
if (!sql) throw new Error("DATABASE_URL is not set");

const issued = await issueApiKey(sql, { email, tier: tier as KeyTier, note });
console.log(`Issued key ${issued.id} (${issued.prefix}...). Shown once:`);
console.log(issued.key);
