// /api/items with ?locale=: a reviewed term replaces the matching value on
// every item that uses it, against real Postgres (PGlite).
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { sourceHash } from "../lib/translations.ts";
import { makeSql } from "./helpers/pg.ts";

const db = vi.hoisted(() => ({ sql: null as any }));
vi.mock("../lib/db.ts", () => ({ getSql: () => db.sql }));
vi.mock("../lib/sentry.ts", () => ({ Sentry: {}, reportError: vi.fn() }));

const { default: handler } = await import("../api/items.ts");

const SCHEMA = [
  "001_items_schema.sql",
  "003_items_harmonization.sql",
  "006_items_region_alt.sql",
  "017_items_shuffle_key.sql",
  "019_storylines.sql",
  "033_items_set_of_work_id.sql",
  "021_shelves.sql",
  "049_translations.sql",
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

function insert(sql: any, table: string, row: Record<string, unknown>) {
  const cols = Object.keys(row);
  return sql.query(
    `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols
      .map((_, i) => `$${i + 1}`)
      .join(", ")})`,
    cols.map((c) => row[c]),
  );
}

const terms: [string, string, string, string][] = [
  ["medium", "etching", "Etching", "Água-forte"],
  ["medium", "oil on canvas", "Oil on canvas", "Óleo sobre tela"],
  ["tags", "print", "Print", "Gravura"],
  ["artist_nationality", "french", "French", "Francês"],
];

let withTerms: any;
let withoutTerms: any;

beforeAll(async () => {
  withTerms = await makeSql([...SCHEMA, "056_term_translations.sql"]);
  withoutTerms = await makeSql(SCHEMA);
  for (const sql of [withTerms, withoutTerms]) {
    await insert(sql, "items", {
      id: "met:1",
      source: "met",
      native_id: "1",
      title: "Self-portrait",
      medium: "oil on canvas",
      artist_nationality: "French",
      tags: "Print, Gouache",
      category: "Paintings & Portraits",
      shuffle_key: 0.25,
    });
    await insert(sql, "items", {
      id: "met:2",
      source: "met",
      native_id: "2",
      title: "Harbour",
      medium: "Etching",
      tags: "Print",
      category: "Works on Paper",
      shuffle_key: 0.75,
    });
  }
  for (const [field, source_key, source_text, text] of terms) {
    await insert(withTerms, "term_translations", {
      field,
      locale: "pt-BR",
      source_key,
      source_text,
      text,
    });
  }
  await insert(withTerms, "translations", {
    entity_type: "item",
    entity_id: "met:2",
    locale: "pt-BR",
    field: "medium",
    text: "Água-forte (texto do museu)",
    origin: "human",
    review_status: "approved",
    source_hash: sourceHash("Etching"),
  });
});

afterAll(async () => {
  await withTerms?.$close();
  await withoutTerms?.$close();
});

describe("catalogue terms", () => {
  it("translates every item's matching values and follows the source's capitalization", async () => {
    db.sql = withTerms;
    const res = await get({ ids: "1", locale: "pt-BR" });
    const [item] = res.body.items;
    expect(item.medium).toBe("óleo sobre tela");
    expect(item.artist_nationality).toBe("Francês");
    expect(item.tags).toBe("Gravura, Gouache");
    expect(item.title).toBe("Self-portrait");
    expect(Object.keys(item.translated).sort()).toEqual([
      "artist_nationality",
      "medium",
      "tags",
    ]);
    expect(item.translated.medium).toEqual({
      origin: "human",
      locale: "pt-BR",
      original: "oil on canvas",
    });
  });

  it("lets an item-level translation win over the term", async () => {
    db.sql = withTerms;
    const res = await get({ ids: "2", locale: "pt-BR" });
    const [item] = res.body.items;
    expect(item.medium).toBe("Água-forte (texto do museu)");
    expect(item.tags).toBe("Gravura");
  });

  it("leaves the manifest alone, which carries no term fields", async () => {
    db.sql = withTerms;
    const res = await get({
      shape: "manifest",
      order: "shuffle",
      start: "0",
      locale: "pt-BR",
    });
    expect(res.statusCode).toBe(200);
    const item = res.body.items.find((i: any) => i.id === "1");
    expect(item.medium).toBeUndefined();
    expect(item.translated).toBeUndefined();
  });

  it("answers exactly as before when no locale is asked for", async () => {
    db.sql = withTerms;
    const plain = await get({ ids: ["1", "2"] });
    db.sql = withoutTerms;
    const before = await get({ ids: ["1", "2"] });
    expect(plain.body).toEqual(before.body);
  });

  it("serves source text when the term table is missing", async () => {
    db.sql = withoutTerms;
    const res = await get({ ids: "1", locale: "pt-BR" });
    expect(res.statusCode).toBe(200);
    expect(res.body.items[0].medium).toBe("oil on canvas");
    expect(res.body.items[0].translated).toBeUndefined();
  });

  it("serves source text for an English request", async () => {
    db.sql = withTerms;
    const res = await get({ ids: "1", locale: "en" });
    expect(res.body.items[0].medium).toBe("oil on canvas");
  });

  it("looks terms up through the primary key, not a scan", async () => {
    const plan = await withTerms.query(
      `EXPLAIN SELECT t.field, t.text FROM term_translations t
         JOIN unnest($1::text[], $2::text[]) AS k(field, source_key)
           ON t.field = k.field AND t.source_key = k.source_key
        WHERE t.locale = ANY($3)`,
      [["medium"], ["etching"], ["pt-BR"]],
    );
    const text = plan
      .map((r: Record<string, string>) => r["QUERY PLAN"])
      .join("\n");
    expect(text).toMatch(/term_translations_pkey|Index/i);
  });
});
