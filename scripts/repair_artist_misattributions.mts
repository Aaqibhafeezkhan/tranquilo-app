#!/usr/bin/env node
//
// Restore the real artist on rows ingestion misattributed through an
// ambiguous canonical-map variant. RULES match on the stored artist AND the
// source's own lifespan, so rows genuinely by that artist stay. ROWS are
// single items whose artist was checked against the source record.
// Re-runnable: a row already corrected no longer matches.
//
//   bun scripts/repair_artist_misattributions.mts            # dry run
//   bun scripts/repair_artist_misattributions.mts --commit

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const STAMP = new Date().toISOString().slice(0, 16).replace(":", "");
const AUDIT = path.join(
  ROOT,
  `data/reference/artist-repair-audit-${STAMP}.json`,
);
const COMMIT = process.argv.includes("--commit");

const RULES = [
  { from: "Niccolo dell' Abbate", birth: "1733", to: "Hubert Robert" },
  { from: "Francisque Millet", birth: "1814", to: "Jean-François Millet" },
  { from: "Bernardo Bellotto", birth: "1697", to: "Antonio Canaletto" },
  {
    from: "Lucas Cranach the Elder",
    birth: "1515",
    to: "Lucas Cranach the Younger",
  },
  { from: "Jan van de Velde II", birth: "1620", to: "Jan van de Velde III" },
  {
    from: "Hans Holbein the Younger",
    birth: "1465",
    to: "Hans Holbein the Elder",
  },
  { from: "Joseph Wright of Derby", birth: "1756", to: "Joseph Wright" },
  {
    from: "Canaletto (Giovanni Antonio Canal)",
    birth: "1697",
    to: "Antonio Canaletto",
  },
];

const ROWS = [
  {
    source: "cleveland",
    native_id: "99807",
    from: "Utagawa Kuniyoshi",
    to: "Kuniyoshi",
  },
  {
    source: "europeana",
    native_id: "/9200579/j4shz7rn",
    from: "David Teniers the Younger",
    to: "Follower of David Teniers the Younger",
  },
  {
    source: "europeana",
    native_id: "/9200579/pj4j3cdj",
    from: "David Teniers the Younger",
    to: "Follower of David Teniers the Younger",
  },
  {
    source: "met",
    native_id: "501524",
    from: "Francisque Millet",
    to: "Millet",
  },
  {
    source: "met",
    native_id: "436611",
    from: "Peter Adolf Hall",
    to: "Style of Peter Adolf Hall",
  },
  {
    source: "met",
    native_id: "436613",
    from: "Peter Adolf Hall",
    to: "Style of Peter Adolf Hall",
  },
  {
    source: "met",
    native_id: "436627",
    from: "Frans Hals",
    to: "Copy after Frans Hals",
  },
  {
    source: "met",
    native_id: "436664",
    from: "Hans Holbein the Younger",
    to: "Copy after Hans Holbein the Younger",
  },
  {
    source: "met",
    native_id: "436666",
    from: "Hans Holbein the Younger",
    to: "Imitator of Hans Holbein the Younger",
  },
  {
    source: "met",
    native_id: "437338",
    from: "Jan Provoost",
    to: "Circle of Jan Provoost",
  },
  {
    source: "met",
    native_id: "459305",
    from: "Claes Jansz. Visscher the Younger",
    to: "Style of Claes Jansz. Visscher the Younger",
  },
  {
    source: "met",
    native_id: "437886",
    from: "Claude-Joseph Vernet",
    to: "Style of Joseph Vernet",
  },
  {
    source: "met",
    native_id: "436406",
    from: "Pierre Narcisse Guérin",
    to: "Follower of Pierre Narcisse Guérin",
  },
  {
    source: "met",
    native_id: "436589",
    from: "William Grimaldi",
    to: "Style of William Grimaldi",
  },
];

const sql = neon(process.env.DATABASE_URL!);

// Birth year must open the lifespan's first year token.
const BY_LIFESPAN = `artist = $1 AND substring(artist_lifespan from '1[0-9]{3}') = $2`;
const BY_ROW = `source = $1 AND native_id = $2 AND artist = $3`;

interface AuditRow {
  source: string;
  native_id: string;
  from: string;
  to: string;
  artist_lifespan: string | null;
  title: string;
}
const audit: AuditRow[] = [];

for (const r of RULES) {
  const rows = await sql.query(
    `SELECT source, native_id, artist_lifespan, title FROM items WHERE ${BY_LIFESPAN}`,
    [r.from, r.birth],
  );
  console.log(
    `${String(rows.length).padStart(3)}  ${r.from} (b. ${r.birth}) -> ${r.to}`,
  );
  for (const x of rows)
    audit.push({ ...x, from: r.from, to: r.to } as AuditRow);
}
for (const r of ROWS) {
  const rows = await sql.query(
    `SELECT source, native_id, artist_lifespan, title FROM items WHERE ${BY_ROW}`,
    [r.source, r.native_id, r.from],
  );
  if (rows.length)
    console.log(`  1  ${r.source} ${r.native_id}: ${r.from} -> ${r.to}`);
  for (const x of rows)
    audit.push({ ...x, from: r.from, to: r.to } as AuditRow);
}
console.log(`${audit.length} row(s) in total`);

if (!COMMIT || !audit.length) {
  console.log("\nDRY RUN -- nothing written. Re-run with --commit.");
  process.exit(0);
}

fs.writeFileSync(
  AUDIT,
  `${JSON.stringify({ applied_at: new Date().toISOString(), rows: audit }, null, 2)}\n`,
);
console.log(`audit written: ${path.relative(ROOT, AUDIT)}`);

let updated = 0;
for (const r of RULES) {
  const res = await sql.query(
    `UPDATE items SET artist = $3 WHERE ${BY_LIFESPAN} RETURNING 1`,
    [r.from, r.birth, r.to],
  );
  updated += res.length;
}
for (const r of ROWS) {
  const res = await sql.query(
    `UPDATE items SET artist = $4 WHERE ${BY_ROW} RETURNING 1`,
    [r.source, r.native_id, r.from, r.to],
  );
  updated += res.length;
}
console.log(`${updated} row(s) updated.`);
