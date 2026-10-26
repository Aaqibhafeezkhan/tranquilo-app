#!/usr/bin/env node
//
// Freeze the artist name -> canonical name mapping. A one-time merge fixed
// the catalogue as it stood; ingestion needs the same rule applied to
// arriving items, or the next pull re-splits every artist just merged.
//
// The mapping is frozen, not recomputed: the canonical name is chosen from
// what the catalogue already holds, which moves as items arrive, so a live
// computation would let a byline change under a visitor mid-push. Re-run
// this deliberately when a refresh is wanted.
//
//   node scripts/build_artist_canonical_map.mts

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import {
  applyAliases,
  buildCanonicalMap,
  type CanonicalGroup,
  chooseCanonical,
  excludedVariants,
  type SpellingCount,
} from "../lib/artist-canonical.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ULAN = path.join(ROOT, "data/reference/ulan-artists.json");
const OUT = path.join(ROOT, "data/reference/artist-canonical.json");
const ALIASES = path.join(ROOT, "data/reference/artist-aliases.json");

for (const l of fs
  .readFileSync(path.join(ROOT, ".env.local"), "utf8")
  .split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
}
const sql = neon(process.env.DATABASE_URL!);

interface ArtistInfo {
  ambiguous?: boolean;
  ulan_id: string;
  variants?: string[];
}

const { artists } = JSON.parse(fs.readFileSync(ULAN, "utf8")) as {
  artists: Record<string, ArtistInfo>;
};

// Grouped from `artists` (every name that matched ULAN unambiguously), not
// from `merges` (only subjects still split at extraction time) -- a
// previously-split artist collapses to one spelling once canonicalisation
// works, so `merges` silently drops it on a later extraction, and a rebuild
// sourced from `merges` alone would un-map it the moment the fix succeeded.
// Grouping by ulan_id keeps its protection regardless.
const byId = new Map<
  string,
  { ourNames: Set<string>; variants: Set<string> }
>();
for (const [name, info] of Object.entries(artists)) {
  if (info.ambiguous) continue; // no single subject to canonicalise toward
  let g = byId.get(info.ulan_id);
  if (!g) {
    g = { ourNames: new Set(), variants: new Set() };
    byId.set(info.ulan_id, g);
  }
  g.ourNames.add(name);
  for (const v of info.variants || []) g.variants.add(v);
}

const excluded = excludedVariants(
  [...byId.values()],
  new Set(
    Object.entries(artists)
      .filter(([, info]) => info.ambiguous)
      .map(([name]) => name),
  ),
);
const previous: Record<string, string> = fs.existsSync(OUT)
  ? JSON.parse(fs.readFileSync(OUT, "utf8"))
  : {};
const groups = [...byId.values()].map((g) => {
  const ourNames = [...g.ourNames];
  const safeVariants = [...g.variants].filter((v) => !excluded.has(v));
  // Rows a merge rewrote now sit under a variant or a previous canonical.
  const held = [
    ...new Set([
      ...ourNames,
      ...safeVariants,
      ...[...ourNames, ...safeVariants]
        .map((n) => previous[n])
        .filter((p): p is string => Boolean(p)),
    ]),
  ];
  return { ...g, ourNames, held };
});

const counts = new Map<string, number>();
const allHeld = [...new Set(groups.flatMap((g) => g.held))];
const CHUNK = 5000;
for (let i = 0; i < allHeld.length; i += CHUNK) {
  const rows = (await sql.query(
    `SELECT artist, count(*)::int n FROM items
      WHERE artist = ANY($1) AND review_status NOT IN ('quarantined','rejected')
      GROUP BY 1`,
    [allHeld.slice(i, i + CHUNK)],
  )) as SpellingCount[];
  for (const r of rows) counts.set(r.artist, r.n);
}

const resolved: CanonicalGroup[] = [];
for (const g of groups) {
  const rows = g.held
    .filter((n) => counts.has(n))
    .map((artist) => ({ artist, n: counts.get(artist)! }));
  // A group with no live rows keeps its previous canonical.
  const canonical =
    chooseCanonical(rows, g.variants) ??
    g.ourNames.map((n) => previous[n]).find(Boolean);
  if (!canonical) continue;
  // Variants included: an unseen variant is what the next pull delivers.
  resolved.push({ canonical, ourNames: g.ourNames, variants: [...g.variants] });
}

const map = applyAliases(
  buildCanonicalMap(resolved, excluded),
  fs.existsSync(ALIASES) ? JSON.parse(fs.readFileSync(ALIASES, "utf8")) : {},
);
fs.writeFileSync(OUT, `${JSON.stringify(map, null, 2)}\n`);
console.log(
  `${resolved.length} group(s) -> ${Object.keys(map).length} name(s) mapped`,
);
console.log(`written to ${path.relative(ROOT, OUT)}`);
console.log(
  `\nspot check: "Rijn, Rembrandt van" -> ${map["Rijn, Rembrandt van"]}`,
);
console.log(`spot check: "Edouard Manet"       -> ${map["Edouard Manet"]}`);
