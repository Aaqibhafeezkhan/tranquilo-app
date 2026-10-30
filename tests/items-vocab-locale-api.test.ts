// ?shape=suggest and ?shape=correction with ?locale=: reviewed translations
// of mediums and tags are offered, source-language entries stay.
import { readFileSync } from "node:fs";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { LIVE_ITEMS_PREDICATE } from "../lib/items-sql.ts";
import { refreshVocabSql, refreshWordsSql } from "../lib/items-vocab.ts";
import { makeSql } from "./helpers/pg.ts";

type Sql = {
  query(text: string, params?: unknown[]): Promise<Record<string, unknown>[]>;
  $close(): Promise<void>;
};

const db = vi.hoisted(() => ({ sql: null as unknown as Sql }));
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
  "018_items_vocab.sql",
  "019_storylines.sql",
  "021_shelves.sql",
  "031_items_delisted_state.sql",
  "033_items_set_of_work_id.sql",
  "043_items_search_place_of_origin.sql",
  "049_translations.sql",
  "056_term_translations.sql",
  "058_items_vocab_locale.sql",
];

function mockRes() {
  const res = {
    statusCode: 200,
    body: null as unknown,
    headers: {} as Record<string, string>,
    setHeader(k: string, v: string) {
      res.headers[k] = v;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

async function get(query: Record<string, unknown>) {
  const res = mockRes();
  await handler(
    { method: "GET", query } as unknown as VercelRequest,
    res as unknown as VercelResponse,
  );
  expect(res.statusCode).toBe(200);
  return res.body as Record<string, Record<string, unknown>[]>;
}

const suggest = async (q: string, locale?: string) =>
  (await get({ shape: "suggest", q, locale })).suggestions;
const correct = async (q: string, locale?: string) =>
  (await get({ shape: "correction", q, locale })).candidates;

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
    item(1, { medium: "Oil on canvas", tags: "Men, Print" }),
  );
  await insert(
    "items",
    item(2, { medium: "Oil on canvas", title: "Oiled harbour" }),
  );
  await insert(
    "items",
    item(3, { medium: "Oil on canvas", review_status: "rejected" }),
  );
  await term("medium", "oil on canvas", "Óleo sobre tela");
  await term("tags", "men", "Homens");
  await db.sql.query(refreshVocabSql());
  await db.sql.query(refreshWordsSql());
  await db.sql.query("SELECT refresh_items_vocab_locale('pt-BR')");
});

afterAll(async () => {
  await db.sql?.$close();
});

describe("suggest in a locale", () => {
  it("offers the translated medium with its live item count", async () => {
    expect(await suggest("oleo", "pt-BR")).toEqual([
      { value: "Óleo sobre tela", type: "Medium", itemCount: 2 },
    ]);
  });

  it("offers translated tags", async () => {
    expect(await suggest("hom", "pt-BR")).toEqual([
      { value: "Homens", type: "Tag", itemCount: 1 },
    ]);
  });

  it("keeps source-language entries and hides a source medium that has a translation", async () => {
    const values = (await suggest("oil", "pt-BR")).map((s) => s.value);
    expect(values).toContain("Oiled harbour");
    expect(values).not.toContain("Oil on canvas");
  });

  it("offers nothing translated without a locale, or for English", async () => {
    expect(await suggest("oleo")).toEqual([]);
    expect(await suggest("oleo", "en")).toEqual([]);
    const values = (await suggest("oil")).map((s) => s.value);
    expect(values).toContain("Oil on canvas");
  });
});

describe("correction in a locale", () => {
  it("proposes translated words for a near miss", async () => {
    expect(await correct("oleoo", "pt-BR")).toContain("oleo");
  });

  it("does not without a locale", async () => {
    expect(await correct("oleoo")).not.toContain("oleo");
  });
});

describe("refresh_items_vocab_locale", () => {
  it("counts live items only, as the English vocabulary does", () => {
    const sql = readFileSync("sql/058_items_vocab_locale.sql", "utf8");
    const compact = (s: string) => s.replace(/\s+/g, " ");
    for (const clause of LIVE_ITEMS_PREDICATE.split(" AND ")) {
      expect(compact(sql)).toContain(compact(clause));
    }
  });

  it("drops a withdrawn term on the next refresh", async () => {
    await db.sql.query(
      "DELETE FROM term_translations WHERE field = 'tags' AND source_key = 'men'",
    );
    await db.sql.query("SELECT refresh_items_vocab_locale('pt-BR')");
    expect(await suggest("hom", "pt-BR")).toEqual([]);
    expect(await correct("homenss", "pt-BR")).not.toContain("homens");
  });
});
