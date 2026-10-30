#!/usr/bin/env node
//   bun scripts/rank_translation_values.mts
//   bun scripts/rank_translation_values.mts --out-dir ranking/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { LIVE_ITEMS_PREDICATE } from "../lib/items-sql.ts";
import { assertReadOnly } from "./profile_item_fill_rates.mts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEVELS = [0.5, 0.8, 0.9, 0.95, 0.99, 1];

function scalar(column: string): string {
  return `
    SELECT ${column} AS value, count(*)::int AS items
    FROM items
    WHERE ${LIVE_ITEMS_PREDICATE} AND coalesce(${column}, '') <> ''
    GROUP BY 1 ORDER BY 2 DESC, 1`;
}

export const RANK_QUERIES: Record<string, string> = {
  medium: scalar("medium"),
  culture: scalar("culture"),
  place_of_origin: scalar("place_of_origin"),
  artist_nationality: scalar("artist_nationality"),
  tags: `
    SELECT trim(t) AS value, count(*)::int AS items
    FROM items, unnest(string_to_array(tags, ',')) t
    WHERE ${LIVE_ITEMS_PREDICATE} AND coalesce(tags, '') <> '' AND trim(t) <> ''
    GROUP BY 1 ORDER BY 2 DESC, 1`,
};

export function coverageThresholds(
  counts: number[],
  levels: number[],
): Record<string, number> {
  const total = counts.reduce((a, b) => a + b, 0);
  const out: Record<string, number> = {};
  for (const level of levels) out[String(level)] = 0;
  if (!total) return out;
  let running = 0;
  counts.forEach((n, i) => {
    running += n;
    for (const level of levels) {
      if (out[String(level)] === 0 && running >= level * total) {
        out[String(level)] = i + 1;
      }
    }
  });
  return out;
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

  const args = process.argv.slice(2);
  const outAt = args.indexOf("--out-dir");
  const outDir = outAt === -1 ? null : args[outAt + 1];
  if (outDir) fs.mkdirSync(outDir, { recursive: true });

  try {
    for (const [field, text] of Object.entries(RANK_QUERIES)) {
      assertReadOnly(text);
      const rows = (await sql.query(text)) as {
        value: string;
        items: number;
      }[];
      const counts = rows.map((r) => r.items);
      const total = counts.reduce((a, b) => a + b, 0);
      const thresholds = coverageThresholds(counts, LEVELS);
      console.log(
        `\n== ${field}: ${rows.length} distinct values, ${total} item-uses ==`,
      );
      for (const level of LEVELS) {
        console.log(
          `  ${String(level * 100).padStart(5)}% of items: top ${thresholds[String(level)]} values`,
        );
      }
      if (outDir) {
        let running = 0;
        const ranked = rows.map((r, i) => {
          running += r.items;
          return {
            rank: i + 1,
            value: r.value,
            items: r.items,
            cumulative_share: Number((running / total).toFixed(4)),
          };
        });
        fs.writeFileSync(
          path.join(outDir, `${field}.json`),
          `${JSON.stringify({ field, distinct: rows.length, thresholds, ranked }, null, 2)}\n`,
        );
      }
    }
    if (outDir) console.log(`\nwrote ${outDir}`);
  } catch (e) {
    console.error("FATAL", e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
