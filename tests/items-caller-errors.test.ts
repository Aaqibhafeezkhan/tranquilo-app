// A caller mistake on /api/items is a 400 that never reaches Sentry: reporting
// typos would bury real failures, and a 500 tells a client to retry something
// that can never succeed. A real query failure is the opposite.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  query: vi.fn(async (): Promise<unknown[]> => []),
}));
const sentry = vi.hoisted(() => ({ reportError: vi.fn() }));
vi.mock("../lib/db.ts", () => ({ getSql: () => db }));
vi.mock("../lib/sentry.ts", () => ({
  Sentry: {},
  reportError: sentry.reportError,
}));

const { default: handler, buildQuery } = await import("../api/items.ts");

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

beforeEach(() => {
  db.query.mockReset();
  db.query.mockResolvedValue([]);
  sentry.reportError.mockReset();
});

describe("/api/items caller mistakes", () => {
  it("answers a malformed cursor with a 400 and does not report it", async () => {
    const res = await get({ limit: "10", cursor: "not-a-cursor" });
    expect(res.statusCode).toBe(400);
    expect(sentry.reportError).not.toHaveBeenCalled();
    expect(db.query).not.toHaveBeenCalled();
  });

  it("answers an unpaged full-row request with a 400 and does not report it", async () => {
    const res = await get({});
    expect(res.statusCode).toBe(400);
    expect(sentry.reportError).not.toHaveBeenCalled();
  });

  it("reports a real query failure as a 500", async () => {
    db.query.mockRejectedValue(new Error("connection reset"));
    const res = await get({ limit: "10" });
    expect(res.statusCode).toBe(500);
    expect(sentry.reportError).toHaveBeenCalledTimes(1);
  });
});

describe("/api/items page size", () => {
  it("caps limit so one request cannot ask for the whole catalogue", () => {
    const q = buildQuery({ limit: "1000000" });
    expect(q.limit).toBeLessThan(1000000);
    expect(q.params.at(-1)).toBe(q.limit);
  });
});
