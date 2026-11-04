#!/usr/bin/env node
//   bun scripts/profile_item_fill_rates.mts
//   bun scripts/profile_item_fill_rates.mts --out report.json
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { LIVE_ITEMS_PREDICATE } from "../lib/items-sql.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const FILL_EXCLUDED_COLUMNS = [
  "search_text",
  "blur_placeholder",
  "caption_tea",
  "tea_voice_claims",
  "review_flags",
];

type Row = Record<string, unknown>;
type Query = (text: string, params?: unknown[]) => Promise<Row[]>;

export function assertReadOnly(text: string): void {
  if (!/^\s*(SELECT|WITH)\b/i.test(text) || /;\s*\S/.test(text)) {
    throw new Error(`refusing non-SELECT statement: ${text.slice(0, 60)}`);
  }
}

export const FILL_SQL = `
  SELECT e.key AS column_name,
         count(*)::int AS total,
         count(*) FILTER (
           WHERE jsonb_typeof(e.value) <> 'null'
             AND e.value NOT IN ('""'::jsonb, '[]'::jsonb, '{}'::jsonb)
         )::int AS filled
  FROM items i
  CROSS JOIN LATERAL jsonb_each(to_jsonb(i) - $2::text[]) e
  WHERE i.source = $1 AND ${LIVE_ITEMS_PREDICATE}
  GROUP BY e.key
  ORDER BY e.key`;

export const COMPANION_QUERIES: Record<string, string> = {
  rows_by_status: `
    SELECT source, review_status, count(*)::int AS n
    FROM items GROUP BY 1, 2 ORDER BY 1, 2`,
  region_unresolved: `
    SELECT source, count(*)::int AS n
    FROM items WHERE ${LIVE_ITEMS_PREDICATE} AND region_primary IS NULL
    GROUP BY 1 ORDER BY 1`,
  date_without_century: `
    SELECT source, count(*)::int AS n
    FROM items
    WHERE ${LIVE_ITEMS_PREDICATE} AND coalesce(date, '') <> '' AND century IS NULL
    GROUP BY 1 ORDER BY 1`,
  default_category_bucket: `
    SELECT source, count(*)::int AS n
    FROM items
    WHERE ${LIVE_ITEMS_PREDICATE} AND category = 'Sculpture & Objects'
    GROUP BY 1 ORDER BY 1`,
  default_media_type_bucket: `
    SELECT source, count(*)::int AS n
    FROM items
    WHERE ${LIVE_ITEMS_PREDICATE} AND media_type = 'Decorative Object'
    GROUP BY 1 ORDER BY 1`,
  license_values: `
    SELECT source, license, count(*)::int AS n
    FROM items WHERE ${LIVE_ITEMS_PREDICATE}
    GROUP BY 1, 2 ORDER BY 1, 3 DESC`,
  culture_single_word_candidates: `
    SELECT source, count(*)::int AS n
    FROM items
    WHERE ${LIVE_ITEMS_PREDICATE}
      AND attribution_type = 'culture'
      AND culture ~ '^[A-Z][A-Za-z-]+$'
    GROUP BY 1 ORDER BY 1`,
  subject_type_null: `
    SELECT source, count(*)::int AS n
    FROM items WHERE ${LIVE_ITEMS_PREDICATE} AND subject_type IS NULL
    GROUP BY 1 ORDER BY 1`,
  title_equals_original_language_title: `
    SELECT source, count(*)::int AS n
    FROM items
    WHERE ${LIVE_ITEMS_PREDICATE}
      AND title_in_original_language IS NOT NULL
      AND title = title_in_original_language
    GROUP BY 1 ORDER BY 1`,
  phash_groups_spanning_sources: `
    SELECT count(*)::int AS groups, coalesce(sum(n), 0)::int AS items
    FROM (
      SELECT phash, count(*) AS n
      FROM items
      WHERE ${LIVE_ITEMS_PREDICATE} AND phash IS NOT NULL
      GROUP BY phash HAVING count(DISTINCT source) > 1
    ) g`,
  source_verified_age_days: `
    SELECT source,
           count(*) FILTER (WHERE source_verified_at IS NULL)::int AS never_verified,
           coalesce(max(extract(day FROM now() - source_verified_at)), 0)::int AS oldest_days
    FROM items WHERE ${LIVE_ITEMS_PREDICATE}
    GROUP BY 1 ORDER BY 1`,
  translation_coverage: `
    SELECT locale, entity_type, review_status, count(*)::int AS n
    FROM translations GROUP BY 1, 2, 3 ORDER BY 1, 2, 3`,
};

export async function profile(query: Query) {
  const sources = (
    await query(
      `SELECT DISTINCT source FROM items WHERE ${LIVE_ITEMS_PREDICATE} ORDER BY 1`,
    )
  ).map((r) => String(r.source));

  const fill: Record<string, Row[]> = {};
  for (const source of sources) {
    fill[source] = await query(FILL_SQL, [source, FILL_EXCLUDED_COLUMNS]);
  }

  const companions: Record<string, Row[]> = {};
  for (const [name, text] of Object.entries(COMPANION_QUERIES)) {
    companions[name] = await query(text);
  }
  return { generated_at: new Date().toISOString(), sources, fill, companions };
}

function printReport(report: Awaited<ReturnType<typeof profile>>) {
  for (const source of report.sources) {
    console.log(`\n== ${source} fill rates (live rows) ==`);
    for (const r of report.fill[source]) {
      const pct = r.total ? (100 * Number(r.filled)) / Number(r.total) : 0;
      console.log(
        `${String(r.column_name).padEnd(34)} ${String(r.filled).padStart(7)}/${String(r.total).padEnd(7)} ${pct.toFixed(1)}%`,
      );
    }
  }
  for (const [name, rows] of Object.entries(report.companions)) {
    console.log(`\n== ${name} ==`);
    for (const r of rows) console.log(JSON.stringify(r));
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  runCli();
}

async function runCli() {
  const envLocalPath = path.join(ROOT, ".env.local");
  if (fs.existsSync(envLocalPath)) {
    for (const line of fs.readFileSync(envLocalPath, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]])
        process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
    }
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(2);
  }
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL);
  const query: Query = async (text, params = []) => {
    assertReadOnly(text);
    return (await sql.query(text, params)) as Row[];
  };

  const args = process.argv.slice(2);
  const outAt = args.indexOf("--out");
  const out = outAt === -1 ? null : args[outAt + 1];

  try {
    const report = await profile(query);
    printReport(report);
    if (out) {
      fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
      console.log(`\nwrote ${out}`);
    }
  } catch (e) {
    console.error("FATAL", e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
