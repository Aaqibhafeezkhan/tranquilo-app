// items.updated_at is the change marker partners sync on. It moves when what
// the API serves for an item changes, and holds still for pipeline
// bookkeeping, so a feed reshuffle or a rules re-run does not make the whole
// catalogue look changed. Against real Postgres (PGlite), using the same
// sql/063 file that is run by hand against Neon.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeSql } from "./helpers/pg.ts";

const MIGRATION = readFileSync(
  join(import.meta.dirname, "..", "sql", "063_items_updated_at.sql"),
  "utf8",
);
const LONG_AGO = "2020-01-01T00:00:00.000Z";

type Sql = Awaited<ReturnType<typeof makeSql>>;
let sql: Sql;

beforeAll(async () => {
  sql = await makeSql([
    "001_items_schema.sql",
    "003_items_harmonization.sql",
    "004_items_rejected_state.sql",
    "005_items_search.sql",
    "017_items_shuffle_key.sql",
    "037_items_visual_metadata.sql",
    "039_items_vibe_search.sql",
    "040_items_accent_color_status.sql",
    "042_items_source_verified_at.sql",
    "049_items_master_dims.sql",
  ]);
  await sql.query(
    "INSERT INTO items (id, source, native_id, title, category, created_at) VALUES " +
      "('met:old1', 'met', 'old1', 'Before', 'Painting', '2019-05-01T00:00:00Z')," +
      "('met:old2', 'met', 'old2', 'Before', 'Painting', '2019-06-01T00:00:00Z')",
  );
  await sql.$db.exec(MIGRATION);
});
afterAll(async () => {
  if (sql) await sql.$close();
});

async function updatedAt(id: string): Promise<string> {
  const rows = await sql.query(
    "SELECT to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') AS t FROM items WHERE id = $1",
    [id],
  );
  return rows[0].t;
}

let n = 0;
async function freshItem(): Promise<string> {
  const native = `u${++n}`;
  await sql.query(
    "INSERT INTO items (id, source, native_id, title, category, updated_at) VALUES ($1, 'met', $2, 'Harbour', 'Painting', $3)",
    [`met:${native}`, native, LONG_AGO],
  );
  return `met:${native}`;
}

async function moved(id: string, set: string, params: unknown[] = []) {
  await sql.query(`UPDATE items SET ${set} WHERE id = $1`, [id, ...params]);
  return (await updatedAt(id)) !== LONG_AGO;
}

describe("the migration", () => {
  it("backfills existing rows to when they were created", async () => {
    expect(await updatedAt("met:old1")).toBe("2019-05-01T00:00:00.000Z");
    expect(await updatedAt("met:old2")).toBe("2019-06-01T00:00:00.000Z");
  });

  it("is safe to run again, and a re-run changes nothing", async () => {
    await sql.$db.exec(MIGRATION);
    expect(await updatedAt("met:old1")).toBe("2019-05-01T00:00:00.000Z");
  });

  it("stamps a new row with the time it was inserted", async () => {
    await sql.query(
      "INSERT INTO items (id, source, native_id, title, category) VALUES ('met:new', 'met', 'new', 'T', 'Painting')",
    );
    expect(Date.now() - Date.parse(await updatedAt("met:new"))).toBeLessThan(
      60_000,
    );
  });
});

describe("what moves updated_at", () => {
  it.each([
    ["title", "title = 'Another title'"],
    ["artist", "artist = 'A. Painter'"],
    ["license", "license = 'cc0'"],
    ["category", "category = 'Sculpture & Objects'"],
    ["image dimensions", "master_width = 4000"],
    ["a served placeholder", "blur_placeholder = 'data:image/png;base64,AA'"],
    ["quarantine", "review_status = 'quarantined'"],
    ["rejection", "review_status = 'rejected'"],
  ])("a change to %s", async (_label, set) => {
    expect(await moved(await freshItem(), set)).toBe(true);
  });

  it("a content change made alongside bookkeeping", async () => {
    const id = await freshItem();
    expect(await moved(id, "title = 'Retitled', shuffle_key = 0.5")).toBe(true);
  });
});

describe("what leaves updated_at alone", () => {
  it.each([
    ["the feed reshuffle", "shuffle_key = 0.123456"],
    ["a harmonize pass", "harmonized_at = now(), rules_version = 99"],
    ["a source recheck", "source_verified_at = now()"],
    ["review flags", `review_flags = '{"changes": []}'::jsonb`],
    ["a human review stamp", "human_reviewed_at = now()"],
    ["a master-size check", "master_dims_checked_at = now()"],
    ["an accent colour status", "accent_color_status = 'checked'"],
    ["a perceptual hash", "phash = 'abc123'"],
    ["a curator boost", "curator_boost = 2"],
  ])("%s", async (_label, set) => {
    expect(await moved(await freshItem(), set)).toBe(false);
  });

  it("an update that writes the values already there", async () => {
    expect(await moved(await freshItem(), "title = title")).toBe(false);
  });
});

describe("setting it by hand", () => {
  it("is respected, so a restore can keep the original times", async () => {
    const id = await freshItem();
    await sql.query(
      "UPDATE items SET title = 'Restored', updated_at = '2021-02-03T04:05:06Z' WHERE id = $1",
      [id],
    );
    expect(await updatedAt(id)).toBe("2021-02-03T04:05:06.000Z");
  });
});
