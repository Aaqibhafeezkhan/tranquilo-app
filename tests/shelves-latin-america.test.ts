// The Brazil and Latin America shelves (sql/044) seed on top of the
// original shelves. Hand-picked, so they are hero shelves: a fixed list in
// authored order, resolved through the same ?ids= path as every other hero
// shelf. Ids mix numeric museum ids, Commons file titles and
// "<instance>:<id>" Tainacan ids, all read as strings.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getShelves } from "../lib/shelves.ts";
import { makeSql } from "./helpers/pg.ts";

let sql: any;
let SHELVES: any[];
beforeAll(async () => {
  sql = await makeSql([
    "021_shelves.sql",
    "022_shelves_seed.sql",
    "044_shelves_seed_brazil_latin_america.sql",
    "045_shelves_brazil_latin_america_first.sql",
  ]);
  SHELVES = await getShelves(sql);
});
afterAll(async () => {
  if (sql) await sql.$close();
});

const byId = (id: string) => SHELVES.find((s) => s.id === id);

describe("Brazil and Latin America shelves", () => {
  it("are hand-picked hero shelves with a full row of items", () => {
    for (const id of ["brazil", "latin-america"]) {
      const shelf = byId(id);
      expect(shelf, id).toBeTruthy();
      expect(shelf.type).toBe("hero");
      expect(shelf.itemIds.length).toBeGreaterThanOrEqual(10);
      expect(new Set(shelf.itemIds.map(String)).size).toBe(
        shelf.itemIds.length,
      );
    }
  });

  it("lead the hand-picked shelves, right after Storylines", () => {
    // Storylines renders as its own section; among the rest, hero shelves
    // keep their position order, so these two open the second section.
    const ids = SHELVES.map((s) => s.id);
    expect(ids.slice(0, 3)).toEqual(["storylines", "brazil", "latin-america"]);
    expect(ids.slice(3)).toEqual([
      "painted-by-themselves",
      "pets-in-art",
      "merry-company",
      "creature-curiosities",
      "old-world-portraiture",
      "birdwatching",
    ]);
  });

  it("include the new Brazilian museum collections", () => {
    const ids = byId("brazil").itemIds.map(String);
    expect(ids.some((i: string) => i.startsWith("margs:"))).toBe(true);
    expect(ids.some((i: string) => i.startsWith("museudoouro:"))).toBe(true);
    expect(ids.some((i: string) => i.startsWith("casadosottoni:"))).toBe(true);
  });

  it("re-running the seed leaves one row per shelf", async () => {
    const seed = (await import("node:fs")).readFileSync(
      new URL(
        "../sql/044_shelves_seed_brazil_latin_america.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await sql.$db.exec(seed);
    const rows = await sql.query(
      "SELECT count(*)::int AS n FROM shelves WHERE id IN ('brazil', 'latin-america')",
    );
    expect(rows[0].n).toBe(2);
  });
});
