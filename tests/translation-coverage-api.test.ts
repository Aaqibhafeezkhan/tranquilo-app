// ?shape=facets&locale=&coverage=1: how much of the live catalogue is
// served translated in a locale, counted by the same rules as serving.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ITEM_FIELDS, sourceHash } from "../lib/translations.ts";
import { makeSql } from "./helpers/pg.ts";

const db = vi.hoisted(() => ({ sql: null as any }));
vi.mock("../lib/db.ts", () => ({ getSql: () => db.sql }));
vi.mock("../lib/sentry.ts", () => ({ Sentry: {}, reportError: vi.fn() }));

const { default: handler } = await import("../api/items.ts");

const SCHEMA = [
  "001_items_schema.sql",
  "003_items_harmonization.sql",
  "004_items_rejected_state.sql",
  "005_items_search.sql",
  "006_items_region_alt.sql",
  "008_items_place_of_origin.sql",
  "017_items_shuffle_key.sql",
  "019_storylines.sql",
  "021_shelves.sql",
  "031_items_delisted_state.sql",
  "033_items_set_of_work_id.sql",
  "037_items_visual_metadata.sql",
  "038_items_palette_buckets.sql",
  "049_translations.sql",
  "056_term_translations.sql",
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

async function get(query: Record<string, unknown>) {
  const res = mockRes();
  await handler({ method: "GET", query } as any, res);
  return res;
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

const translation = (id: string, field: string, source: string) =>
  insert("translations", {
    entity_type: "item",
    entity_id: id,
    locale: "pt-BR",
    field,
    text: `${field} em português`,
    origin: "human",
    review_status: "approved",
    source_hash: sourceHash(source),
  });

beforeAll(async () => {
  db.sql = await makeSql(SCHEMA);
  await insert(
    "items",
    item(1, {
      title: "Self-portrait",
      medium: "Oil on canvas",
      culture: "French",
      tags: "Men, Print",
    }),
  );
  await insert(
    "items",
    item(2, { title: "Harbour", medium: "Etching", tags: "Print" }),
  );
  await insert(
    "items",
    item(3, {
      title: "Rejected",
      medium: "Oil on canvas",
      review_status: "rejected",
    }),
  );
  await insert("items", item(4, { title: "Bare" }));
  await term("medium", "oil on canvas", "Óleo sobre tela");
  await term("tags", "men", "Homens");
  await term("tags", "print", "Gravura");
  await translation("met:1", "title", "Self-portrait");
  await translation("met:2", "title", "Harbor");
  await translation("met:2", "medium", "Etching");
});

afterAll(async () => {
  await db.sql?.$close();
});

const coverage = async (locale: string) =>
  (await get({ shape: "facets", locale, coverage: "1" })).body.translation;

describe("translation coverage", () => {
  it("counts live items with a value, and how many are served translated", async () => {
    const t = await coverage("pt-BR");
    expect(t.locale).toBe("pt-BR");
    expect(t.fields.title).toEqual({ items: 3, translated: 1 });
    expect(t.fields.medium).toEqual({ items: 2, translated: 2 });
    expect(t.fields.culture).toEqual({ items: 1, translated: 0 });
    expect(t.fields.tags).toEqual({ items: 2, translated: 2 });
    expect(t.fields.caption_tea).toEqual({ items: 0, translated: 0 });
  });

  it("does not count a translation of text that has since changed", async () => {
    const t = await coverage("pt-BR");
    expect(t.fields.title.translated).toBe(1);
  });

  it("counts an item's tags only when every tag has a translation", async () => {
    await db.sql.query(
      "DELETE FROM term_translations WHERE field = 'tags' AND source_key = 'men'",
    );
    expect((await coverage("pt-BR")).fields.tags).toEqual({
      items: 2,
      translated: 1,
    });
  });

  it("reports nothing translated for a locale with no rows", async () => {
    const t = await coverage("en");
    expect(Object.values(t.fields).every((f: any) => f.translated === 0)).toBe(
      true,
    );
  });

  it("covers every translatable field", async () => {
    const t = await coverage("pt-BR");
    expect(Object.keys(t.fields).sort()).toEqual([...ITEM_FIELDS].sort());
  });

  it("leaves the facets answer alone unless coverage is asked for", async () => {
    const plain = (await get({ shape: "facets" })).body;
    const withLocale = (await get({ shape: "facets", locale: "pt-BR" })).body;
    expect(plain.translation).toBeUndefined();
    expect(withLocale).toEqual(plain);
  });

  it("is a 400 to ask for coverage without a locale", async () => {
    const res = await get({ shape: "facets", coverage: "1" });
    expect(res.statusCode).toBe(400);
  });
});
