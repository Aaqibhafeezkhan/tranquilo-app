#!/usr/bin/env node
//
// Apply the ULAN name merges to items.artist.
//
// Our catalogue holds one artist under several spellings, and `artist` is
// compared by exact string in four places (declusterOrder, ?artist=, the
// facet pool, the byline), so every one of them is wrong for a split
// artist. search_text is GENERATED ALWAYS from artist, so it regenerates
// itself with no separate step.
//
// What's lost is the source's exact spelling -- mitigated since every item
// links to its own object page, where the institution's wording is
// authoritative. --commit writes an audit file naming every row changed and
// its previous value, before the update runs, so the merge can be undone
// exactly.
//
//   node scripts/merge_artist_names.mts             # dry run
//   node scripts/merge_artist_names.mts --commit
//
// --from-map applies data/reference/artist-canonical.json, the frozen map
// ingestion uses, instead of re-deriving groups from ULAN `merges`. Its
// audit goes to a dated file, leaving earlier audits intact.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import {
  chooseCanonical,
  planFromMap,
  type SpellingCount,
} from "../lib/artist-canonical.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const STORE = path.join(ROOT, "data/reference/ulan-artists.json");
const MAP = path.join(ROOT, "data/reference/artist-canonical.json");
const COMMIT = process.argv.includes("--commit");
const USE_ULAN = process.argv.includes("--ulan-names");
const FROM_MAP = process.argv.includes("--from-map");
// --skip <file>: a JSON array of spellings a reviewer rejected.
const SKIP_AT = process.argv.indexOf("--skip");
const SKIP = new Set<string>(
  SKIP_AT > 0
    ? JSON.parse(fs.readFileSync(process.argv[SKIP_AT + 1], "utf8"))
    : [],
);
const AUDIT = path.join(
  ROOT,
  FROM_MAP
    ? `data/reference/artist-merge-audit-${new Date().toISOString().slice(0, 10)}.json`
    : "data/reference/artist-merge-audit.json",
);

interface PlanEntry {
  ulan_id?: string;
  canonical: string;
  total: number;
  alreadyCorrect: number;
  changing: { from: string; items: number }[];
  newCanonical: boolean;
}

const LIVE = `review_status NOT IN ('quarantined','rejected')`;

async function planFromCanonicalMap(): Promise<PlanEntry[]> {
  const map: Record<string, string> = JSON.parse(fs.readFileSync(MAP, "utf8"));
  const keys = Object.keys(map).filter((k) => map[k] !== k);
  const rows = (await sql.query(
    `SELECT artist, count(*)::int n FROM items
      WHERE artist = ANY($1) AND ${LIVE} GROUP BY 1`,
    [keys],
  )) as SpellingCount[];
  const rewrites = planFromMap(rows, map, SKIP);
  const targets = [...new Set(rewrites.map((r) => r.to))];
  const held = (await sql.query(
    `SELECT artist, count(*)::int n FROM items
      WHERE artist = ANY($1) AND ${LIVE} GROUP BY 1`,
    [targets],
  )) as SpellingCount[];
  const heldCount = new Map(held.map((r) => [r.artist, r.n]));

  const byTarget = new Map<string, PlanEntry>();
  for (const r of rewrites) {
    const already = heldCount.get(r.to) ?? 0;
    const e = byTarget.get(r.to) ?? {
      canonical: r.to,
      total: already,
      alreadyCorrect: already,
      changing: [],
      newCanonical: already === 0,
    };
    e.total += r.items;
    e.changing.push({ from: r.from, items: r.items });
    byTarget.set(r.to, e);
  }
  return [...byTarget.values()];
}

for (const line of fs
  .readFileSync(path.join(ROOT, ".env.local"), "utf8")
  .split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
}
const sql = neon(process.env.DATABASE_URL!);

async function planFromUlanMerges(): Promise<PlanEntry[]> {
  const { merges } = JSON.parse(fs.readFileSync(STORE, "utf8"));
  const groups = (merges || []).filter((g: any) => g.ourNames.length > 1);
  console.log(`${groups.length} merge group(s) from ULAN\n`);

  const plan: PlanEntry[] = [];
  for (const g of groups) {
    const rows = await sql.query(
      `SELECT artist, count(*)::int n FROM items
        WHERE artist = ANY($1) AND review_status NOT IN ('quarantined','rejected')
        GROUP BY 1 ORDER BY 2 DESC`,
      [g.ourNames],
    );
    if (!rows.length) continue;

    // ULAN is authoritative on grouping, not on display -- its preferred
    // form is a cataloguing convention, often worse to read (drops accents,
    // hyphens, capitalises particles). The canonical name is ours; see
    // lib/artist-canonical.ts. --ulan-names switches to ULAN's preference.
    const canonical =
      USE_ULAN && g.preferredName
        ? g.preferredName
        : chooseCanonical(rows as SpellingCount[], g.variants ?? []);
    if (!canonical) continue;
    const total = rows.reduce((a, r) => a + r.n, 0);
    const changing = rows.filter((r) => r.artist !== canonical);
    plan.push({
      ulan_id: g.subjectId,
      canonical,
      total,
      alreadyCorrect: total - changing.reduce((a, r) => a + r.n, 0),
      changing: changing.map((r) => ({ from: r.artist, items: r.n })),
      newCanonical: !g.ourNames.includes(canonical),
    });
  }
  return plan;
}

async function main() {
  const plan = FROM_MAP
    ? await planFromCanonicalMap()
    : await planFromUlanMerges();

  plan.sort((a, b) => b.total - a.total);
  const rowsChanging = plan.reduce(
    (a, p) => a + p.changing.reduce((s, c) => s + c.items, 0),
    0,
  );
  const newNames = plan.filter((p) => p.newCanonical);

  console.log(`${plan.length} group(s) present in the catalogue`);
  console.log(`${rowsChanging} row(s) would have their artist rewritten\n`);

  for (const p of plan.slice(0, 12)) {
    console.log(
      `  ${p.canonical}   (${p.total} items)${p.newCanonical ? "   <- NEW byline, not a spelling we use" : ""}`,
    );
    for (const c of p.changing)
      console.log(`      ${String(c.items).padStart(3)}  ${c.from}`);
  }
  if (plan.length > 12)
    console.log(`  ... and ${plan.length - 12} more groups`);

  if (newNames.length) {
    console.log(
      `\n${newNames.length} group(s) adopt a canonical name we do NOT currently use.`,
    );
    console.log(
      "   Every item in those groups gets a byline no visitor has seen before:",
    );
    for (const p of newNames.slice(0, 8)) {
      console.log(
        `      ${p.canonical}   <- ${p.changing.map((c) => c.from).join(" / ")}`,
      );
    }
  }

  if (!COMMIT) {
    console.log("\nDRY RUN -- nothing written. Re-run with --commit.");
    return;
  }

  // Audit before the update: a merge that can't be undone shouldn't run
  // against thousands of rows.
  const before: {
    source: string;
    native_id: string;
    from: string;
    to: string;
  }[] = [];
  for (const p of plan) {
    for (const c of p.changing) {
      const rows = await sql.query(
        `SELECT source, native_id FROM items WHERE artist = $1`,
        [c.from],
      );
      rows.forEach((r) => {
        before.push({
          source: r.source,
          native_id: r.native_id,
          from: c.from,
          to: p.canonical,
        });
      });
    }
  }
  fs.writeFileSync(
    AUDIT,
    `${JSON.stringify(
      {
        applied_at: new Date().toISOString(),
        source: "Getty ULAN ulan_rel_0126 (ODC-BY 1.0)",
        rows: before,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `\naudit written: ${before.length} row(s) recorded in ${path.relative(ROOT, AUDIT)}`,
  );

  let updated = 0;
  for (const p of plan) {
    for (const c of p.changing) {
      const res = await sql.query(
        `UPDATE items SET artist = $1 WHERE artist = $2 RETURNING 1`,
        [p.canonical, c.from],
      );
      updated += res.length;
    }
  }
  console.log(`${updated} row(s) updated. search_text regenerates itself.`);
}

main().catch((e) => {
  console.error("FATAL", e?.message || e);
  process.exit(1);
});
