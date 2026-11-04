// The artist string as the source delivered it is internal: kept so a wrong
// canonicalisation can be undone, never served.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { makeSql } from "./helpers/pg.ts";

const db = vi.hoisted(() => ({ sql: null as unknown }));
vi.mock("../lib/db.ts", () => ({ getSql: () => db.sql }));
vi.mock("../lib/sentry.ts", () => ({ Sentry: {}, reportError: vi.fn() }));

const { default: handler } = await import("../api/items.ts");

const RAW = "Raw Spelling From The Source (1801-1860)";

async function get(query: Record<string, string>) {
  const res = {
    statusCode: 200,
    body: null as unknown,
    setHeader(_k: string, _v: string) {},
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
  };
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
    "051_items_artist_raw.sql",
  ])) as { query(text: string, params: unknown[]): Promise<unknown[]> };
  await sql.query(
    `INSERT INTO items (id, source, native_id, title, artist, artist_raw, category)
     VALUES ('met:1', 'met', '1', 'Harbour', 'Canonical Name', $1, 'Paintings')`,
    [RAW],
  );
  db.sql = sql;
});

describe("the raw artist string", () => {
  it.each([
    ["full rows", { ids: "1" }],
    ["manifest", { shape: "manifest", order: "shuffle", start: "0" }],
  ])("is never served in %s", async (_label, query) => {
    const res = await get(query);
    expect(res.statusCode).toBe(200);
    const body = JSON.stringify(res.body);
    expect(body).toContain("Canonical Name");
    expect(body).not.toContain("artist_raw");
    expect(body).not.toContain(RAW);
  });
});
