#!/usr/bin/env node
//
// Reconcile the patrons table with Patreon, for any webhook that was missed.
// Run locally only; the creator token never goes to Vercel.
//
// Reads from .env.local: DATABASE_URL, PATREON_CREATOR_TOKEN,
// PATREON_CAMPAIGN_ID. Prints counts and member ids, never names.
//
//   bun scripts/patreon-sync.mts            # dry run
//   bun scripts/patreon-sync.mts --commit

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import {
  fetchCampaignMembers,
  forgetPatron,
  savePatron,
  saveTiers,
} from "../lib/patreon.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const COMMIT = process.argv.includes("--commit");

for (const l of fs
  .readFileSync(path.join(ROOT, ".env.local"), "utf8")
  .split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
}

const missing = [
  "DATABASE_URL",
  "PATREON_CREATOR_TOKEN",
  "PATREON_CAMPAIGN_ID",
].filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`missing in .env.local: ${missing.join(", ")}`);
  process.exit(2);
}

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const { members, tiers } = await fetchCampaignMembers(
    process.env.PATREON_CREATOR_TOKEN!,
    process.env.PATREON_CAMPAIGN_ID!,
  );
  const known = (
    await sql`SELECT member_id FROM patrons WHERE full_name <> ''`
  ).map((r) => String(r.member_id));
  const live = new Set(members.map((m) => m.memberId));
  const gone = known.filter((id) => !live.has(id));
  const added = members.filter((m) => !known.includes(m.memberId));

  console.log(`Patreon: ${members.length} member(s), ${tiers.length} tier(s)`);
  console.log(`new: ${added.length}  gone: ${gone.length}  ${gone.join(" ")}`);

  if (!COMMIT) {
    console.log("Dry run. Re-run with --commit to write.");
    return;
  }
  await saveTiers(sql, tiers);
  for (const member of members) await savePatron(sql, member);
  for (const id of gone) await forgetPatron(sql, id);
  console.log("Written.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
