#!/usr/bin/env node
//
// Fill items.artist_raw for rows ingested before the column existed.
//
// The value is the earliest artist string we hold: the first `from` in the
// artist merge/repair audits, else the current artist. It is recorded only
// where ingestion cannot have produced it (see lib/artist-raw.ts); the rest
// stay NULL. Only NULL rows are written, so a re-run is safe.
//
//   bun scripts/backfill_artist_raw.mts            # dry run
//   bun scripts/backfill_artist_raw.mts --commit

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import { rawArtistFor } from "../lib/artist-raw.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const REF = path.join(ROOT, "data/reference");
const MAP = "data/reference/artist-canonical.json";
const COMMIT = process.argv.includes("--commit");
// The ingestion commit that first applied canonical_artist().
const CANONICALISED_FROM = new Date("2026-08-24T16:10:48Z");
const CHUNK = 5000;

const sql = neon(process.env.DATABASE_URL!);

function everCanonical(): Set<string> {
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 1 << 30,
    });
  const out = new Set<string>();
  for (const rev of git("log", "--format=%H", "--", MAP)
    .split("\n")
    .filter(Boolean)) {
    const map: Record<string, string> = JSON.parse(
      git("show", `${rev}:${MAP}`),
    );
    for (const v of Object.values(map)) out.add(v);
  }
  return out;
}

function earliestAudited(): Map<string, string> {
  const audits = fs
    .readdirSync(REF)
    .filter((f) => /^artist-(merge|repair)-audit.*\.json$/.test(f))
    .map((f) => JSON.parse(fs.readFileSync(path.join(REF, f), "utf8")))
    .sort((a, b) => a.applied_at.localeCompare(b.applied_at));
  const out = new Map<string, string>();
  for (const a of audits) {
    for (const r of a.rows) {
      const key = `${r.source}\u0000${r.native_id}`;
      if (!out.has(key)) out.set(key, r.from);
    }
  }
  return out;
}

const canonicals = everCanonical();
const audited = earliestAudited();
const rows = (await sql.query(
  "SELECT id, source, native_id, artist, created_at FROM items WHERE artist_raw IS NULL",
)) as {
  id: string;
  source: string;
  native_id: string;
  artist: string | null;
  created_at: string;
}[];

const fill: { id: string; raw: string }[] = [];
let fromAudit = 0;
for (const r of rows) {
  const raw = rawArtistFor(
    { artist: r.artist, created_at: new Date(r.created_at) },
    audited.get(`${r.source}\u0000${r.native_id}`),
    canonicals,
    CANONICALISED_FROM,
  );
  if (raw === null) continue;
  fill.push({ id: r.id, raw });
  if (raw !== r.artist) fromAudit++;
}

console.log(`${canonicals.size} names any map version used as canonical`);
console.log(`${rows.length} row(s) without artist_raw`);
console.log(
  `${fill.length} can be filled (${fromAudit} from an audit's earlier value)`,
);
console.log(`${rows.length - fill.length} stay NULL (original unknown)`);

if (!COMMIT) {
  console.log("\nDRY RUN -- nothing written. Re-run with --commit.");
  process.exit(0);
}

let written = 0;
for (let i = 0; i < fill.length; i += CHUNK) {
  const part = fill.slice(i, i + CHUNK);
  const res = await sql.query(
    `UPDATE items SET artist_raw = v.raw
       FROM unnest($1::text[], $2::text[]) AS v(id, raw)
      WHERE items.id = v.id AND items.artist_raw IS NULL
      RETURNING 1`,
    [part.map((f) => f.id), part.map((f) => f.raw)],
  );
  written += res.length;
}
console.log(`${written} row(s) written.`);
