// The manifest reads only the columns it returns. SELECT * over every live
// item outgrew the Neon HTTP driver's 64 MB response cap, and the unpaged
// manifest started failing with a 500 while the paged feed kept working.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { makeSql } from "./helpers/pg.ts";

const db = vi.hoisted(() => ({ sql: null as unknown }));
vi.mock("../lib/db.ts", () => ({ getSql: () => db.sql }));
vi.mock("../lib/sentry.ts", () => ({ Sentry: {}, reportError: vi.fn() }));

const { default: handler, buildQuery } = await import("../api/items.ts");

const MANIFEST_KEYS = [
  "artist",
  "category",
  "contains_nudity",
  "id",
  "media_type",
  "palette",
  "region_alt",
  "region_primary",
  "set_of_work_id",
  "shuffle_key",
  "source",
  "storyline_ids",
  "subject_type",
  "timeframe",
  "title",
  "twist_category",
];

function mockRes() {
  const res = {
    statusCode: 200,
    body: null as unknown,
    setHeader(_k: string, _v: string) {},
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

async function get(query: Record<string, string>) {
  const res = mockRes();
  await handler(
    { method: "GET", query } as unknown as VercelRequest,
    res as unknown as VercelResponse,
  );
  return res;
}

beforeAll(async () => {
  const sql = (await makeSql([
    "001_items_schema.sql",
    "003_items_harmonization.sql",
    "006_items_region_alt.sql",
    "017_items_shuffle_key.sql",
    "033_items_set_of_work_id.sql",
  ])) as { query(text: string, params: unknown[]): Promise<unknown[]> };
  await sql.query(
    `INSERT INTO items (id, source, native_id, title, artist, category,
       timeframe, palette, media_type, region_primary, region_alt,
       subject_type, storyline_ids, set_of_work_id, contains_nudity,
       twist_category, medium, bio)
     VALUES ('met:1', 'met', '1', 'Harbour', 'A. Painter', 'Paintings',
       '1800s', 'Blue', 'Painting', 'Europe', ARRAY['West Asia'],
       'Landscape', ARRAY['harbours'], 'set-1', false,
       'Hidden detail', 'Oil on canvas', 'A long biography')`,
    [],
  );
  db.sql = sql;
});

describe("manifest queries", () => {
  it.each([
    ["unpaged", { shape: "manifest" }],
    ["paged shuffle", { shape: "manifest", order: "shuffle", start: "0" }],
  ])("%s manifest does not SELECT *", (_label, params) => {
    const q = buildQuery(params);
    expect(q.text).not.toMatch(/SELECT \*/);
  });

  it("unpaged manifest returns every manifest field from a real row", async () => {
    const res = await get({ shape: "manifest" });
    expect(res.statusCode).toBe(200);
    const items = res.body as Record<string, unknown>[];
    expect(items).toHaveLength(1);
    expect(Object.keys(items[0]).sort()).toEqual(MANIFEST_KEYS);
    expect(items[0].title).toBe("Harbour");
    expect(items[0].region_alt).toEqual(["West Asia"]);
  });

  it("paged shuffle manifest returns every field and a usable cursor", async () => {
    const res = await get({
      shape: "manifest",
      order: "shuffle",
      start: "0",
      limit: "1",
    });
    expect(res.statusCode).toBe(200);
    const body = res.body as {
      items: Record<string, unknown>[];
      next_cursor: string | null;
    };
    expect(Object.keys(body.items[0]).sort()).toEqual(MANIFEST_KEYS);
    expect(body.next_cursor).toEqual(expect.any(String));
  });

  it("full-row pages still select every column", () => {
    expect(buildQuery({ limit: "10" }).text).toMatch(/SELECT \*/);
  });
});
