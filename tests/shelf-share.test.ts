// A Discover shelf's share link: the /shelf/{id} slug scheme, the shelf
// lookup, and the preview (work count + cover) the share page and its
// card describe the shelf with. Runs against PGlite, seeded from the real
// shelf migrations, so hero and rule shelves resolve through real SQL.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { INSTITUTION_NAMES } from "../lib/institution-names.ts";
import {
  getShelf,
  getShelfPreview,
  getShelves,
  isShareableShelf,
  parseShelfSlug,
  SHELF_SLUG_PREFIX,
  shelfSlug,
} from "../lib/shelves.ts";
import { STORYLINE_SLUG_PREFIX } from "../lib/storylines.ts";
import { makeSql } from "./helpers/pg.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vercelConfig = JSON.parse(
  readFileSync(path.join(__dirname, "../vercel.json"), "utf8"),
);

function insertItem(sql: any, source: string, nativeId: string, extra = {}) {
  const row: Record<string, unknown> = {
    id: `${source}:${nativeId}`,
    source,
    native_id: nativeId,
    title: `Test ${nativeId}`,
    category: "Painting",
    ...extra,
  };
  const cols = Object.keys(row);
  return sql.query(
    `INSERT INTO items (${cols.join(", ")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")})`,
    cols.map((c) => row[c]),
  );
}

let sql: any;
let SHELVES: any[];
beforeAll(async () => {
  sql = await makeSql([
    "001_items_schema.sql",
    "003_items_harmonization.sql",
    "005_items_search.sql",
    "006_items_region_alt.sql",
    "017_items_shuffle_key.sql",
    "031_items_delisted_state.sql",
    "038_items_palette_buckets.sql",
    "021_shelves.sql",
    "022_shelves_seed.sql",
  ]);
  SHELVES = await getShelves(sql);

  // birdwatching's seeded itemIds start 140408, 451725, 132616, ...
  await insertItem(sql, "cleveland", "451725");
  await insertItem(sql, "cleveland", "140408");
  await insertItem(sql, "cleveland", "132616", { review_status: "rejected" });
  await insertItem(sql, "commons", "File:A Colorful Spring.jpg", {
    category: "Photography",
  });

  const portrait = {
    category: "Paintings & Portraits",
    region_primary: "Europe",
    subject_type: "portrait",
  };
  await insertItem(sql, "met", "p1", { ...portrait, shuffle_key: 0.9 });
  await insertItem(sql, "met", "p2", { ...portrait, shuffle_key: 0.1 });
  await insertItem(sql, "met", "p3", {
    ...portrait,
    region_primary: "West Asia",
    region_alt: ["Europe"],
    shuffle_key: 0.5,
  });
  await insertItem(sql, "met", "p4", { ...portrait, region_primary: "Asia" });
  await insertItem(sql, "met", "p5", {
    ...portrait,
    review_status: "quarantined",
    shuffle_key: 0.01,
  });
});
afterAll(async () => {
  if (sql) await sql.$close();
});

describe("shelf share slugs", () => {
  it("round-trips every seeded shelf id", () => {
    for (const shelf of SHELVES) {
      expect(parseShelfSlug(shelfSlug(shelf.id))).toBe(shelf.id);
    }
  });

  it("does not claim artwork or storyline slugs", () => {
    expect(parseShelfSlug("met-436535")).toBeNull();
    expect(parseShelfSlug("s-el-greco-evolution")).toBeNull();
    expect(parseShelfSlug("shelf")).toBeNull();
    expect(parseShelfSlug("shelf-")).toBeNull();
    expect(parseShelfSlug("")).toBeNull();
    expect(parseShelfSlug(undefined)).toBeNull();
  });

  it("reserves its prefix against every source and the storyline prefix", () => {
    const sources = [
      ...Object.keys(INSTITUTION_NAMES),
      "smithsonian",
      "tainacan",
    ];
    expect(sources).not.toContain(SHELF_SLUG_PREFIX);
    expect(SHELF_SLUG_PREFIX).not.toBe(STORYLINE_SLUG_PREFIX);
  });

  it("every seeded shelf id is URL-safe as-is", () => {
    for (const shelf of SHELVES) {
      expect(shelf.id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("is served at /shelf/{id} through the existing share-page function", () => {
    expect(vercelConfig.rewrites).toContainEqual({
      source: "/shelf/:id",
      destination: `/api/v/${SHELF_SLUG_PREFIX}-:id`,
    });
  });
});

describe("which shelves are shareable", () => {
  it("every hand-picked and rule shelf", () => {
    expect(isShareableShelf(SHELVES.find((s) => s.id === "birdwatching"))).toBe(
      true,
    );
    expect(
      isShareableShelf(SHELVES.find((s) => s.id === "old-world-portraiture")),
    ).toBe(true);
  });

  it("not the storylines shelf, whose contents are filled in the browser", () => {
    expect(isShareableShelf(SHELVES.find((s) => s.id === "storylines"))).toBe(
      false,
    );
  });
});

describe("getShelf", () => {
  it("resolves a seeded shelf in the client's shape", async () => {
    const shelf = await getShelf(sql, "old-world-portraiture");
    expect(shelf).toMatchObject({
      id: "old-world-portraiture",
      title: "Old World Portraiture",
      type: "rule",
      minItems: 10,
    });
  });

  it("returns null for an unknown or empty id", async () => {
    expect(await getShelf(sql, "no-such-shelf")).toBeNull();
    expect(await getShelf(sql, "")).toBeNull();
  });
});

describe("getShelfPreview", () => {
  it("hero shelf: counts live works and covers with the first live one in curated order", async () => {
    const preview = await getShelfPreview(
      sql,
      SHELVES.find((s) => s.id === "birdwatching"),
    );
    // 132616 is rejected and the Commons file is Photography, so hidden.
    expect(preview.count).toBe(2);
    expect(preview.cover?.native_id).toBe("140408");
  });

  it("rule shelf: matches the filter like the feed does, alternates included", async () => {
    const preview = await getShelfPreview(
      sql,
      SHELVES.find((s) => s.id === "old-world-portraiture"),
    );
    // p1, p2, and p3 via region_alt; p4 is Asia, p5 is quarantined.
    expect(preview.count).toBe(3);
    expect(preview.cover?.native_id).toBe("p2");
  });

  it("an empty hero shelf has no works and no cover", async () => {
    const preview = await getShelfPreview(sql, {
      id: "empty",
      title: "Empty",
      type: "hero",
      itemIds: [],
    });
    expect(preview).toEqual({ count: 0, cover: null });
  });
});
