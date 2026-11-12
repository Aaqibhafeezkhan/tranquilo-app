// Edge cache lifetimes for the public /api/items shapes.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/db.ts", () => ({
  getSql: () =>
    Object.assign(async () => [], {
      query: vi.fn(async (text: string) => {
        if (text.includes("INSERT INTO visitor_fetch_state")) {
          return [{ tokens: 10 }];
        }
        return [];
      }),
    }),
}));
vi.mock("../lib/sentry.ts", () => ({ Sentry: {}, reportError: vi.fn() }));

const { default: handler } = await import("../api/items.ts");

async function cacheControl(query: Record<string, string>) {
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 200,
    setHeader(name: string, value: string) {
      headers[name] = value;
    },
    json() {
      return res;
    },
  };
  await handler(
    { method: "GET", query, headers: {} } as unknown as VercelRequest,
    res as unknown as VercelResponse,
  );
  return headers["Cache-Control"] ?? "";
}

function sMaxAge(value: string): number {
  return Number(/s-maxage=(\d+)/.exec(value)?.[1] ?? 0);
}

function staleWhileRevalidate(value: string): number {
  return Number(/stale-while-revalidate=(\d+)/.exec(value)?.[1] ?? 0);
}

describe("edge cache policy", () => {
  const bootShapes = [
    "facets",
    "storylines",
    "shelves",
    "music",
    "heroes",
    "set_of_works",
  ];

  for (const shape of bootShapes) {
    it(`serves ${shape} from the edge for at least an hour and revalidates in the background`, async () => {
      const value = await cacheControl({ shape });
      expect(value).toMatch(/^public/);
      expect(sMaxAge(value)).toBeGreaterThanOrEqual(3600);
      expect(staleWhileRevalidate(value)).toBeGreaterThanOrEqual(86400);
    });
  }

  it("serves feed pages from the edge for at least an hour", async () => {
    const value = await cacheControl({
      shape: "manifest",
      order: "shuffle",
      start: "0.5",
      limit: "60",
    });
    expect(value).toMatch(/^public/);
    expect(sMaxAge(value)).toBeGreaterThanOrEqual(3600);
    expect(staleWhileRevalidate(value)).toBeGreaterThanOrEqual(86400);
  });

  it("keeps lookups by key short-lived", async () => {
    const value = await cacheControl({ keys: "met:1" });
    expect(sMaxAge(value)).toBeLessThanOrEqual(300);
  });

  it("never caches an error response at the edge for long", async () => {
    const value = await cacheControl({ shape: "manifest", order: "shuffle" });
    expect(sMaxAge(value)).toBeLessThan(3600);
  });
});
