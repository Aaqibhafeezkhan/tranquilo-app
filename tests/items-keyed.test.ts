// The keyed tier of /api/items, reached at /v1/items: authentication, cache
// headers, quota, metering and the extra `keyed` block.

import { readFileSync } from "node:fs";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateApiKey, hashApiKey } from "../lib/api-keys.ts";

const ROW = {
  id: "met:1",
  source: "met",
  native_id: "1",
  title: "Harbour",
  artist: "A. Painter",
  img: "https://images.example/1.jpg",
  license: "cc0",
  source_verified_at: "2026-10-01T00:00:00.000Z",
  rules_version: 7,
  contributors: [{ name: "Léon Davent", role: "engraver" }],
  review_flags: { changes: [{ rule_id: "x" }] },
  caption_tea: "A caption",
};

const KEY = generateApiKey();
const state = {
  keyRows: [{ id: "5", tier: "partner" }] as unknown[],
  budgetRows: [{ tokens: 10 }] as unknown[],
  failBudget: false,
  failAuth: false,
  itemRows: [ROW] as unknown[],
};
const queries: { text: string; params: unknown[] }[] = [];

vi.mock("../lib/db.ts", () => ({
  getSql: () => ({
    query: vi.fn(async (text: string, params: unknown[]) => {
      queries.push({ text, params });
      if (text.includes("FROM api_keys")) {
        if (state.failAuth) throw new Error("down");
        return params[0] === hashApiKey(KEY) ? state.keyRows : [];
      }
      if (text.includes("INSERT INTO visitor_fetch_state")) {
        if (state.failBudget) throw new Error("down");
        return state.budgetRows;
      }
      if (text.includes("INSERT INTO api_usage")) return [];
      return state.itemRows;
    }),
  }),
}));
vi.mock("../lib/sentry.ts", () => ({ Sentry: {}, reportError: vi.fn() }));

const { default: handler } = await import("../api/items.ts");

async function call(
  query: Record<string, string>,
  headers: Record<string, string> = {},
) {
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
    { method: "GET", query, headers } as unknown as VercelRequest,
    res as unknown as VercelResponse,
  );
  return res;
}

const keyed = { audience: "keyed", keys: "met:1" };
const bearer = { authorization: `Bearer ${KEY}` };

beforeEach(() => {
  queries.length = 0;
  state.keyRows = [{ id: "5", tier: "partner" }];
  state.budgetRows = [{ tokens: 10 }];
  state.failBudget = false;
  state.failAuth = false;
  state.itemRows = [ROW];
});

describe("keyed audience: authentication", () => {
  it("answers 401 without a key, before touching the catalogue", async () => {
    const res = await call(keyed);
    expect(res.statusCode).toBe(401);
    expect(res.headers["WWW-Authenticate"]).toMatch(/^Bearer/);
    expect(queries.some((q) => q.text.includes("FROM items"))).toBe(false);
  });

  it("answers 401 for an unknown or revoked key", async () => {
    const res = await call(keyed, {
      authorization: `Bearer ${generateApiKey()}`,
    });
    expect(res.statusCode).toBe(401);
  });

  it("answers 503 when keys cannot be checked", async () => {
    state.failAuth = true;
    const res = await call(keyed, bearer);
    expect(res.statusCode).toBe(503);
  });

  it("serves a valid key", async () => {
    const res = await call(keyed, bearer);
    expect(res.statusCode).toBe(200);
  });
});

describe("keyed audience: caching", () => {
  it("never lets a keyed response be shared", async () => {
    const res = await call(keyed, bearer);
    expect(res.headers["Cache-Control"]).toBe("private, no-store");
  });

  it("makes even an error private", async () => {
    const res = await call(keyed);
    expect(res.headers["Cache-Control"]).toBe("private, no-store");
  });

  it("leaves the public path cacheable and ignores a key sent to it", async () => {
    const res = await call({ keys: "met:1" }, bearer);
    expect(res.statusCode).toBe(200);
    expect(res.headers["Cache-Control"]).toMatch(/s-maxage=300/);
    expect(queries.some((q) => q.text.includes("api_keys"))).toBe(false);
    const { items } = res.body as { items: Record<string, unknown>[] };
    expect(items[0].keyed).toBeUndefined();
  });
});

describe("keyed audience: quota and metering", () => {
  it("charges the key's own bucket by rows requested", async () => {
    await call(keyed, bearer);
    const charge = queries.find((q) =>
      q.text.includes("INSERT INTO visitor_fetch_state"),
    );
    expect(charge?.params[0]).toBe("key:5");
    expect(charge?.params[1]).toBe(1);
  });

  it("answers 429 over quota, without reading items", async () => {
    state.budgetRows = [];
    const res = await call(keyed, bearer);
    expect(res.statusCode).toBe(429);
    expect(queries.some((q) => q.text.includes("FROM items"))).toBe(false);
  });

  it("fails closed when the quota cannot be checked", async () => {
    state.failBudget = true;
    const res = await call(keyed, bearer);
    expect(res.statusCode).toBe(503);
  });

  it("counts the request and flags a denial in usage", async () => {
    await call(keyed, bearer);
    state.budgetRows = [];
    await call(keyed, bearer);
    const usage = queries.filter((q) =>
      q.text.includes("INSERT INTO api_usage"),
    );
    expect(usage.map((q) => q.params)).toEqual([
      [5, "lookup", 1, 0],
      [5, "lookup", 1, 1],
    ]);
  });
});

describe("keyed audience: shape", () => {
  it("adds a keyed block to full item rows", async () => {
    const res = await call(keyed, bearer);
    const { items } = res.body as { items: Record<string, unknown>[] };
    expect(items[0].keyed).toEqual({
      source_verified_at: "2026-10-01T00:00:00.000Z",
      rules_version: 7,
    });
    expect(items[0].title).toBe("Harbour");
  });

  it("never exposes internal columns", async () => {
    const res = await call(keyed, bearer);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain("review_flags");
    expect(body).not.toContain("contributors");
    expect(body).not.toContain("Léon Davent");
    expect(body).not.toContain("A caption");
  });

  it("refuses shapes that are not catalogue queries", async () => {
    const res = await call({ audience: "keyed", shape: "shelves" }, bearer);
    expect(res.statusCode).toBe(400);
  });
});

describe("routing and documentation", () => {
  it("serves /v1/items through the items function as the keyed audience", () => {
    const config = JSON.parse(
      readFileSync(new URL("../vercel.json", import.meta.url), "utf8"),
    );
    expect(config.rewrites).toContainEqual({
      source: "/v1/items",
      destination: "/api/items?audience=keyed",
    });
  });

  it("documents the keyed endpoint with a bearer scheme", () => {
    const spec = readFileSync(
      new URL("../api/openapi.yaml", import.meta.url),
      "utf8",
    );
    expect(spec).toMatch(/\/v1\/items:/);
    expect(spec).toMatch(/apiKey:\n\s+type: http\n\s+scheme: bearer/);
  });
});
