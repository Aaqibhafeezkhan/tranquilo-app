// ?q= with ?locale=: reviewed translations of medium, tags and place of
// origin become searchable, without losing source-text matches.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { makeSql } from "./helpers/pg.ts";

const db = vi.hoisted(() => ({ sql: null as any }));
vi.mock("../lib/db.ts", () => ({ getSql: () => db.sql }));
vi.mock("../lib/sentry.ts", () => ({ Sentry: {}, reportError: vi.fn() }));

const { default: handler } = await import("../api/items.ts");

const SCHEMA = [
  "001_items_schema.sql",
  "003_items_harmonization.sql",
  "005_items_search.sql",
  "006_items_region_alt.sql",
  "008_items_place_of_origin.sql",
  "017_items_shuffle_key.sql",
  "019_storylines.sql",
  "021_shelves.sql",
  "033_items_set_of_work_id.sql",
  "043_items_search_place_of_origin.sql",
  "049_translations.sql",
  "056_term_translations.sql",
  "057_item_search_locale.sql",
];

function mockRes(): any {
  return {
    statusCode: 200,
    body: null,
    headers: {} as Record<string, string>,
    setHeader(k: string, v: string) {
      this.headers[k] = v;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
}

async function ids(query: Record<string, unknown>): Promise<string[]> {
  const res = mockRes();
  await handler(
    {
      method: "GET",
      query: { shape: "manifest", order: "shuffle", start: "0", ...query },
    } as any,
    res,
  );
  expect(res.statusCode).toBe(200);
  return res.body.items.map((i: any) => i.id).sort();
}

function insert(table: string, row: Record<string, unknown>) {
  const cols = Object.keys(row);
  return db.sql.query(
    `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols
      .map((_, i) => `$${i + 1}`)
      .join(", ")})`,
    cols.map((c) => row[c]),
  );
}

const item = (n: number, over: Record<string, unknown>) => ({
  id: `met:${n}`,
  source: "met",
  native_id: String(n),
  title: `Work ${n}`,
  category: "Works on Paper",
  shuffle_key: n / 10,
  ...over,
});

const term = (field: string, source_key: string, text: string) =>
  insert("term_translations", {
    field,
    locale: "pt-BR",
    source_key,
    source_text: source_key,
    text,
  });

beforeAll(async () => {
  db.sql = await makeSql(SCHEMA);
  await insert(
    "items",
    item(1, { medium: "Oil on canvas", tags: "Print, Men" }),
  );
  await insert(
    "items",
    item(2, { medium: "Etching", place_of_origin: "Japan" }),
  );
  await term("medium", "oil on canvas", "Óleo sobre tela");
  await term("tags", "men", "Homens");
  await term("place_of_origin", "japan", "Japão");
  await db.sql.query("SELECT refresh_item_search_locale('pt-BR')");
  await insert("items", item(3, { medium: "Oil on canvas" }));
});

afterAll(async () => {
  await db.sql?.$close();
});

describe("search in a locale", () => {
  it("matches the translated medium, ignoring case and accents", async () => {
    expect(await ids({ q: "óleo sobre tela", locale: "pt-BR" })).toEqual(["1"]);
    expect(await ids({ q: "OLEO", locale: "pt-BR" })).toEqual(["1"]);
  });

  it("matches translated tags and places of origin", async () => {
    expect(await ids({ q: "homens", locale: "pt-BR" })).toEqual(["1"]);
    expect(await ids({ q: "japao", locale: "pt-BR" })).toEqual(["2"]);
  });

  it("still matches source text, including items added since the refresh", async () => {
    expect(await ids({ q: "oil on canvas", locale: "pt-BR" })).toEqual([
      "1",
      "3",
    ]);
    expect(await ids({ q: "work 2", locale: "pt-BR" })).toEqual(["2"]);
  });

  it("does not search translations without a locale, or for another one", async () => {
    expect(await ids({ q: "óleo sobre tela" })).toEqual([]);
    expect(await ids({ q: "óleo sobre tela", locale: "en" })).toEqual([]);
  });

  it("drops an item from the locale index when its term is withdrawn", async () => {
    await db.sql.query(
      "DELETE FROM term_translations WHERE field = 'tags' AND source_key = 'men'",
    );
    const [{ refresh_item_search_locale: refreshed }] = await db.sql.query(
      "SELECT refresh_item_search_locale('pt-BR')",
    );
    expect(refreshed).toBe(3);
    expect(await ids({ q: "homens", locale: "pt-BR" })).toEqual([]);
    expect(await ids({ q: "óleo sobre tela", locale: "pt-BR" })).toEqual([
      "1",
      "3",
    ]);
  });

  it("looks the locale index up through its trigram index", async () => {
    const plan = await db.sql.query(
      `EXPLAIN SELECT item_id FROM item_search_locale
        WHERE locale = 'pt-BR' AND extra_text LIKE '%oleo%'`,
    );
    const text = plan
      .map((r: Record<string, string>) => r["QUERY PLAN"])
      .join("\n");
    expect(text).toMatch(/item_search_locale/);
  });
});
