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

  it("come after every existing shelf, Brazil first", () => {
    const ids = SHELVES.map((s) => s.id);
    expect(ids.slice(-2)).toEqual(["brazil", "latin-america"]);
    expect(ids.slice(0, -2)).toContain("birdwatching");
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
