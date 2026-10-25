#!/usr/bin/env node
//
// Restore the real artist on rows ingestion misattributed through an
// ambiguous canonical-map variant. Each rule matches on the stored artist
// AND the source's own lifespan, so rows genuinely by that artist stay.
//
//   bun scripts/repair_artist_misattributions.mts            # dry run
//   bun scripts/repair_artist_misattributions.mts --commit

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUDIT = path.join(
  ROOT,
  `data/reference/artist-repair-audit-${new Date().toISOString().slice(0, 10)}.json`,
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
];

const sql = neon(process.env.DATABASE_URL!);

// Birth year must open the lifespan's first year token.
const MATCH = `artist = $1 AND substring(artist_lifespan from '1[0-9]{3}') = $2`;

const audit: {
  source: string;
  native_id: string;
  from: string;
  to: string;
  artist_lifespan: string;
  title: string;
}[] = [];
for (const r of RULES) {
  const rows = await sql.query(
    `SELECT source, native_id, artist_lifespan, title FROM items WHERE ${MATCH}`,
    [r.from, r.birth],
  );
  console.log(
    `${String(rows.length).padStart(3)}  ${r.from} (b. ${r.birth}) -> ${r.to}`,
  );
  for (const x of rows)
    audit.push({
      source: x.source,
      native_id: x.native_id,
      from: r.from,
      to: r.to,
      artist_lifespan: x.artist_lifespan,
      title: x.title,
    });
}
console.log(`${audit.length} row(s) in total`);

if (!COMMIT) {
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
    `UPDATE items SET artist = $3 WHERE ${MATCH} RETURNING 1`,
    [r.from, r.birth, r.to],
  );
  updated += res.length;
}
console.log(`${updated} row(s) updated.`);
