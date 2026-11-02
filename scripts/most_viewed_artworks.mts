#!/usr/bin/env node
// Usage: bun scripts/most_viewed_artworks.mts [--limit N] [--since-days N]
import { neon } from "@neondatabase/serverless";
import { mostViewedArtworks } from "../lib/most-viewed.ts";

function numberFlag(name: string, fallback: number | undefined) {
  const at = process.argv.indexOf(name);
  if (at === -1) return fallback;
  const value = Number(process.argv[at + 1]);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} needs a positive number`);
  }
  return value;
}

const limit = numberFlag("--limit", 25) as number;
const sinceDays = numberFlag("--since-days", undefined);
const since = sinceDays
  ? new Date(Date.now() - sinceDays * 24 * 3600 * 1000)
  : undefined;

const sql = neon(process.env.DATABASE_URL!);
const rows = await mostViewedArtworks(sql as any, { limit, since });

if (rows.length === 0) {
  console.log("No artwork_view events yet.");
} else {
  rows.forEach((r, i) => {
    console.log(
      `${String(i + 1).padStart(2)}. ${r.views} views  ${r.title ?? "(untitled)"} — ${r.artist ?? "unknown"}  [${r.source}:${r.native_id}]`,
    );
  });
}
