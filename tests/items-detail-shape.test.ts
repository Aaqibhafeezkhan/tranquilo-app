// ?shape=detail returns one item's curated text and nothing else.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ROW = {
  id: "met:1",
  source: "met",
  native_id: "1",
  title: "Harbour",
  artist: "A. Painter",
  img: "https://images.example/1.jpg",
  contributors: [{ name: "Léon Davent", role: "engraver" }],
  caption_tea: "A caption",
  caption_basic: "A basic caption",
  tea_voice_claims: [
    {
      status: "grounded",
      text: "A claim",
      source_url: "https://example.org/claim",
    },
  ],
  cast: [
    { name: "Sitter", source_url: "javascript:alert(1)", tidbit: "A tidbit" },
  ],
  cast_context: { status: "grounded", text: "Context" },
  cast_tier: "full",
  twist_category: "forgery",
  twist_hook: "A hook",
  twist_story: "A story",
  twist_source_url: "https://example.org/twist",
};

const queries: { text: string; params: unknown[] }[] = [];
let rows: unknown[] = [ROW];

vi.mock("../lib/db.ts", () => ({
  getSql: () => ({
    query: vi.fn(async (text: string, params: unknown[]) => {
      queries.push({ text, params });
      return rows;
    }),
  }),
}));
vi.mock("../lib/sentry.ts", () => ({ Sentry: {}, reportError: vi.fn() }));

const { default: handler } = await import("../api/items.ts");

async function call(query: Record<string, string | string[]>) {
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null as unknown,
    setHeader(name: string, value: string) {
      res.headers[name] = value;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
  };
  await handler(
    { method: "GET", query, headers: {} } as unknown as VercelRequest,
    res as unknown as VercelResponse,
  );
  return res;
}

beforeEach(() => {
  queries.length = 0;
  rows = [ROW];
});

describe("shape=detail", () => {
  it("returns the curated fields for the requested item", async () => {
    const res = await call({ shape: "detail", key: "met:1" });
    const { item } = res.body as { item: Record<string, unknown> };
    expect(res.statusCode).toBe(200);
    expect(item.caption_tea).toBe("A caption");
    expect(item.tea_voice_sources).toEqual([
      { text: "A claim", url: "https://example.org/claim" },
    ]);
    expect(item.cast_context).toEqual({ status: "grounded", text: "Context" });
    expect(item.twist_story).toBe("A story");
    expect(item.twist_source_url).toBe("https://example.org/twist");
  });

  it("carries only curated text, nothing the feed already has", async () => {
    const res = await call({ shape: "detail", key: "met:1" });
    const { item } = res.body as { item: Record<string, unknown> };
    expect(Object.keys(item).sort()).toEqual(
      [
        "caption_tea",
        "cast",
        "cast_context",
        "tea_voice_sources",
        "twist_source_url",
        "twist_story",
      ].sort(),
    );
  });

  it("drops unsafe links from the cast, as the bulk shape does", async () => {
    const res = await call({ shape: "detail", key: "met:1" });
    const { item } = res.body as { item: { cast: { source_url: unknown }[] } };
    expect(item.cast[0].source_url).toBeNull();
  });

  it("looks up exactly one live item by source and native id", async () => {
    await call({ shape: "detail", key: "met:1" });
    expect(queries[0].params).toEqual(["met", "1"]);
  });

  it("keeps a native id that contains a colon intact", async () => {
    await call({ shape: "detail", key: "npm:U:15646" });
    expect(queries[0].params).toEqual(["npm", "U:15646"]);
  });

  it("answers 404 for an item that is not live", async () => {
    rows = [];
    const res = await call({ shape: "detail", key: "met:404" });
    expect(res.statusCode).toBe(404);
  });

  it.each([
    ["no key", {}],
    ["an empty key", { key: "" }],
    ["a key without a source", { key: "1" }],
  ])("rejects %s with 400", async (_name, extra) => {
    const res = await call({ shape: "detail", ...extra });
    expect(res.statusCode).toBe(400);
    expect(queries).toHaveLength(0);
  });
});
