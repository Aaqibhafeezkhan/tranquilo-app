// Native ids repeat across sources (met:107208 and cleveland:107208 are
// different artworks), so a full-row lookup must be able to name the source.
// ?keys=source:native_id matches both columns; ?ids= keeps its documented
// native-id-only behaviour. Against real Postgres (PGlite).
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { makeSql } from "./helpers/pg.ts";

const db = vi.hoisted(() => ({ sql: null as unknown }));
vi.mock("../lib/db.ts", () => ({ getSql: () => db.sql }));
vi.mock("../lib/sentry.ts", () => ({ Sentry: {}, reportError: vi.fn() }));

const { default: handler } = await import("../api/items.ts");

type Sql = Awaited<ReturnType<typeof makeSql>>;
let sql: Sql;

function insertItem(source: string, nativeId: string, title: string) {
  return sql.query(
    "INSERT INTO items (id, source, native_id, title, category) VALUES ($1, $2, $3, $4, 'Painting')",
    [`${source}:${nativeId}`, source, nativeId, title],
  );
}

beforeAll(async () => {
  sql = await makeSql(["001_items_schema.sql", "003_items_harmonization.sql"]);
  await insertItem("met", "107208", "Met work");
  await insertItem("cleveland", "107208", "Cleveland work");
  await insertItem("npm", "U:15646", "NPM work");
  db.sql = sql;
});
afterAll(async () => {
  if (sql) await sql.$close();
});

async function get(query: Record<string, string | string[]>) {
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
  return res as {
    statusCode: number;
    body: {
      items: { source: string; id: string; title: string }[];
      missing: string[];
    };
  };
}

describe("?keys= lookups", () => {
  it("returns only the named source's item for a shared native id", async () => {
    const res = await get({ keys: "met:107208" });
    expect(res.statusCode).toBe(200);
    expect(res.body.items.map((i) => [i.source, i.id, i.title])).toEqual([
      ["met", "107208", "Met work"],
    ]);
    expect(res.body.missing).toEqual([]);
  });

  it("returns each named item once when both sources are asked for", async () => {
    const res = await get({ keys: ["met:107208", "cleveland:107208"] });
    expect(
      res.body.items.map((i) => `${i.source}:${i.id}:${i.title}`).sort(),
    ).toEqual(["cleveland:107208:Cleveland work", "met:107208:Met work"]);
  });

  it("splits on the first colon only, since native ids can contain one", async () => {
    const res = await get({ keys: "npm:U:15646" });
    expect(res.body.items.map((i) => i.title)).toEqual(["NPM work"]);
  });

  it("reports unresolved keys as keys", async () => {
    const res = await get({ keys: ["met:107208", "smithsonian:107208"] });
    expect(res.body.missing).toEqual(["smithsonian:107208"]);
  });

  it.each([
    [{ keys: "107208" }],
    [{ keys: ":107208" }],
    [{ keys: "met:" }],
    [{ keys: "" }],
    [{ keys: "met:1", ids: "1" }],
  ])("rejects a malformed request %j", async (query) => {
    expect((await get(query)).statusCode).toBe(400);
  });

  it("looks up at most 100 keys per request", async () => {
    const keys = (n: number) =>
      Array.from({ length: n }, (_, i) => `met:id-${i}`);
    expect((await get({ keys: keys(100) })).statusCode).toBe(200);
    expect((await get({ keys: keys(101) })).statusCode).toBe(400);
  });
});

describe("?ids= lookups", () => {
  it("still match every source with that native id, as documented", async () => {
    const res = await get({ ids: "107208" });
    expect(res.body.items.map((i) => i.source).sort()).toEqual([
      "cleveland",
      "met",
    ]);
  });
});
