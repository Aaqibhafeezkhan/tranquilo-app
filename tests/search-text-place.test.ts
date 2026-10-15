// search_text is the one column server-side search (?q=) matches against.
// An anonymous object has no artist or bio, so for many of them the place
// of production is the only geographic word in the record -- a Minas Gerais
// santo de roca should be findable by "Minas Gerais" or "Brasil".
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeSql } from "./helpers/pg.ts";

let sql: any;

beforeAll(async () => {
  sql = await makeSql([
    "001_items_schema.sql",
    "003_items_harmonization.sql",
    "005_items_search.sql",
    "008_items_place_of_origin.sql",
    "043_items_search_place_of_origin.sql",
  ]);
  await sql.query(
    "INSERT INTO items (id, source, native_id, title, artist, place_of_origin) VALUES ($1, $2, $3, $4, $5, $6)",
    [
      "tainacan:casadosottoni:1",
      "tainacan",
      "casadosottoni:1",
      "Santo de roca",
      "Unknown",
      "Brasil, Minas Gerais",
    ],
  );
});
afterAll(async () => {
  if (sql) await sql.$close();
});

const matches = async (q: string) =>
  (
    await sql.query(
      "SELECT count(*)::int AS n FROM items WHERE search_text LIKE '%' || immutable_unaccent(lower($1)) || '%'",
      [q],
    )
  )[0].n;

describe("search_text", () => {
  it("includes the place of production", async () => {
    expect(await matches("Minas Gerais")).toBe(1);
    expect(await matches("brasil")).toBe(1);
  });

  it("still includes the fields it had before", async () => {
    expect(await matches("santo de roca")).toBe(1);
  });

  it("is still folded for accents and case", async () => {
    expect(await matches("MINAS GERAIS")).toBe(1);
  });

  it("still has its trigram index", async () => {
    const rows = await sql.query(
      "SELECT indexname FROM pg_indexes WHERE tablename = 'items' AND indexname = 'items_search_text_trgm_idx'",
    );
    expect(rows).toHaveLength(1);
  });
});
