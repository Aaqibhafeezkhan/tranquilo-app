// Per-visitor-IP budget on /api/items, charged by how many items a request
// asks for. See lib/items-rate-limit.ts.
import { describe, expect, it, vi } from "vitest";
import {
  acquireItemsBudget,
  itemsCost,
  itemsRateLimitOrRespond,
} from "../lib/items-rate-limit.ts";

function fakeSql(results: any[]) {
  const queue = results.slice();
  const fn: any = async (text: string, params?: any[]) => {
    fn.calls.push({ text, params });
    const next = queue.shift();
    if (next instanceof Error) throw next;
    return next === undefined ? [] : next;
  };
  fn.calls = [];
  fn.query = fn;
  return fn;
}

function fakeRes() {
  return {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as any,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    json(body: any) {
      this.body = body;
    },
  };
}

const LIMITS = { capacity: 100, refill_per_sec: 0.5, enforce: true };
const req = { headers: { "x-forwarded-for": "203.0.113.7" } };

describe("itemsCost", () => {
  it("charges a page by the rows it asks for", () => {
    expect(itemsCost({ limit: 60 })).toBe(60);
  });

  it("charges a lookup by the ids it asks for", () => {
    expect(itemsCost({ lookup: true, requestedIds: ["a", "b", "c"] })).toBe(3);
  });

  it("charges an aggregate answer one token", () => {
    expect(itemsCost({ facets: true })).toBe(1);
    expect(itemsCost({ suggest: true })).toBe(1);
    expect(itemsCost({ counting: true })).toBe(1);
    expect(itemsCost({ correction: true })).toBe(1);
  });
});

describe("acquireItemsBudget", () => {
  it("spends the cost and allows the request", async () => {
    const sql = fakeSql([[{ tokens: 40 }]]);
    const verdict = await acquireItemsBudget(sql, "203.0.113.7", 60, LIMITS);
    expect(verdict).toMatchObject({ allowed: true, tokens: 40 });
    expect(sql.calls[0].params).toEqual(["items:203.0.113.7", 60, 100, 0.5]);
  });

  it("keeps its own bucket, apart from the image budget", async () => {
    const sql = fakeSql([[{ tokens: 1 }]]);
    await acquireItemsBudget(sql, "203.0.113.7", 1, LIMITS);
    expect(sql.calls[0].params[0]).not.toBe("203.0.113.7");
  });

  it("denies when the bucket cannot cover the cost", async () => {
    const verdict = await acquireItemsBudget(
      fakeSql([[]]),
      "203.0.113.7",
      60,
      LIMITS,
    );
    expect(verdict).toMatchObject({ allowed: false, reason: "rate-limited" });
  });

  it("never charges more than the bucket can hold", async () => {
    const sql = fakeSql([[{ tokens: 0 }]]);
    await acquireItemsBudget(sql, "203.0.113.7", 5000, LIMITS);
    expect(sql.calls[0].params[1]).toBe(100);
  });

  it("fails open when the database errors", async () => {
    const verdict = await acquireItemsBudget(
      fakeSql([new Error("down")]),
      "203.0.113.7",
      60,
      LIMITS,
    );
    expect(verdict.allowed).toBe(true);
  });

  it("allows a request whose visitor cannot be identified", async () => {
    const verdict = await acquireItemsBudget(fakeSql([]), null, 60, LIMITS);
    expect(verdict.allowed).toBe(true);
  });
});

describe("itemsRateLimitOrRespond", () => {
  it("sends 429 with Retry-After when denied and enforcing", async () => {
    const res = fakeRes();
    const sent = await itemsRateLimitOrRespond(
      fakeSql([[]]),
      req,
      res,
      60,
      LIMITS,
    );
    expect(sent).toBe(true);
    expect(res.statusCode).toBe(429);
    expect(Number(res.headers["Retry-After"])).toBeGreaterThanOrEqual(1);
    expect(res.headers["Cache-Control"]).toBe("no-store");
  });

  it("lets the request through when denied but not enforcing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = fakeRes();
    const sent = await itemsRateLimitOrRespond(fakeSql([[]]), req, res, 60, {
      ...LIMITS,
      enforce: false,
    });
    expect(sent).toBe(false);
    expect(res.statusCode).toBe(200);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("lets an allowed request through", async () => {
    const res = fakeRes();
    const sent = await itemsRateLimitOrRespond(
      fakeSql([[{ tokens: 10 }]]),
      req,
      res,
      60,
      LIMITS,
    );
    expect(sent).toBe(false);
    expect(res.statusCode).toBe(200);
  });
});
