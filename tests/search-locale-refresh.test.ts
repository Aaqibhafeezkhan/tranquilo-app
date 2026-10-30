// The nightly refresh rebuilds locale search for every locale with terms,
// and must never fail the job it runs inside.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { refreshLocaleSearch } from "../lib/search-locale.ts";
import { makeSql } from "./helpers/pg.ts";

vi.mock("../lib/sentry.ts", () => ({ Sentry: {}, reportError: vi.fn() }));

let sql: any;
let bare: any;

beforeAll(async () => {
  sql = await makeSql([
    "001_items_schema.sql",
    "003_items_harmonization.sql",
    "005_items_search.sql",
    "008_items_place_of_origin.sql",
    "043_items_search_place_of_origin.sql",
    "056_term_translations.sql",
    "057_item_search_locale.sql",
    "018_items_vocab.sql",
    "058_items_vocab_locale.sql",
  ]);
  bare = await makeSql(["001_items_schema.sql"]);
  await sql.query(
    "INSERT INTO items (id, source, native_id, title, medium, category) VALUES ('met:1','met','1','A','Silk','Works on Paper')",
  );
  for (const locale of ["pt-BR", "fr"]) {
    await sql.query(
      "INSERT INTO term_translations (field, locale, source_key, source_text, text) VALUES ('medium', $1, 'silk', 'Silk', 'Soie')",
      [locale],
    );
  }
});
afterAll(async () => {
  await sql?.$close();
  await bare?.$close();
});

describe("refreshLocaleSearch", () => {
  it("rebuilds each locale that has terms", async () => {
    expect(await refreshLocaleSearch(sql)).toEqual({ "fr": 1, "pt-BR": 1 });
    const rows = await sql.query(
      "SELECT locale FROM item_search_locale ORDER BY locale",
    );
    expect(rows.map((r: any) => r.locale)).toEqual(["fr", "pt-BR"]);
  });

  it("rebuilds each locale's suggestion vocabulary too", async () => {
    const rows = await sql.query(
      "SELECT locale, value FROM items_vocab_locale ORDER BY locale",
    );
    expect(rows.map((r: any) => `${r.locale}:${r.value}`)).toEqual([
      "fr:Soie",
      "pt-BR:Soie",
    ]);
  });

  it("reports nothing and does not throw before the tables exist", async () => {
    expect(await refreshLocaleSearch(bare)).toEqual({});
  });
});
