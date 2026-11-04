// /api/items with ?locale=: the templated caption follows the item's
// translated title and terms, against real Postgres (PGlite).
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { sourceHash } from "../lib/translations.ts";
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
  "005_items_search.sql",
  "006_items_region_alt.sql",
  "008_items_place_of_origin.sql",
  "017_items_shuffle_key.sql",
  "019_storylines.sql",
  "021_shelves.sql",
  "033_items_set_of_work_id.sql",
  "049_translations.sql",
  "056_term_translations.sql",
];

type Item = {
  id: string;
  caption_basic: string;
  translated?: Record<
    string,
    { origin: string; locale: string; original: string }
  >;
};

async function items(query: Record<string, unknown>): Promise<Item[]> {
  const res = {
    statusCode: 200,
    body: null as unknown,
    setHeader() {},
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
  };
  await handler(
    { method: "GET", query } as unknown as VercelRequest,
    res as unknown as VercelResponse,
  );
  return (res.body as { items: Item[] }).items;
}

const insert = (table: string, row: Record<string, unknown>) => {
  const cols = Object.keys(row);
  return db.sql.query(
    `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols
      .map((_, i) => `$${i + 1}`)
      .join(", ")})`,
    cols.map((c) => row[c]),
  );
};

const row = (n: number, over: Record<string, unknown>) => ({
  id: `met:${n}`,
  source: "met",
  native_id: String(n),
  title: "Self-portrait",
  artist: "Rembrandt",
  date: "1630",
  medium: "Oil on canvas",
  category: "Works on Paper",
  shuffle_key: n / 10,
  caption_basic: "Self-portrait by Rembrandt (1630) -- Oil on canvas",
  ...over,
});

beforeAll(async () => {
  db.sql = (await makeSql(SCHEMA)) as unknown as Sql;
  await insert("items", row(1, {}));
  await insert("items", row(2, { caption_basic: "A hand-written caption." }));
  await insert("term_translations", {
    field: "medium",
    locale: "pt-BR",
    source_key: "oil on canvas",
    source_text: "Oil on canvas",
    text: "Óleo sobre tela",
  });
  await insert("translations", {
    entity_type: "item",
    entity_id: "met:1",
    locale: "pt-BR",
    field: "title",
    text: "Autorretrato",
    origin: "human",
    review_status: "approved",
    source_hash: sourceHash("Self-portrait"),
  });
});

afterAll(async () => {
  await db.sql?.$close();
});

describe("caption_basic in a locale", () => {
  it("is rebuilt from the translated title and medium", async () => {
    const [item] = await items({ ids: "1", locale: "pt-BR" });
    expect(item.caption_basic).toBe(
      "Autorretrato de Rembrandt (1630) -- Óleo sobre tela",
    );
    expect(item.translated?.caption_basic).toEqual({
      origin: "human",
      locale: "pt-BR",
      original: "Self-portrait by Rembrandt (1630) -- Oil on canvas",
    });
  });

  it("leaves a caption that is not the template's output", async () => {
    const [item] = await items({ ids: "2", locale: "pt-BR" });
    expect(item.caption_basic).toBe("A hand-written caption.");
  });

  it("is unchanged without a locale, or for English", async () => {
    for (const locale of [undefined, "en"]) {
      const [item] = await items({ ids: "1", locale });
      expect(item.caption_basic).toBe(
        "Self-portrait by Rembrandt (1630) -- Oil on canvas",
      );
      expect(item.translated).toBeUndefined();
    }
  });
});
