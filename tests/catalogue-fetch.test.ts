// The catalogue tooling reads production's /api/items, which sits behind
// Bot Protection. A request carrying FIREWALL_BYPASS_TOKEN in the bypass
// header gets through; without the variable, requests stay plain.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAllItems, fetchManifest } from "../lib/catalogue.ts";

let seen: { url: string; headers: Record<string, string> }[];

beforeEach(() => {
  seen = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      seen.push({
        url,
        headers: (init?.headers as Record<string, string>) ?? {},
      });
      return {
        ok: true,
        status: 200,
        json: async () => ({ items: [], next_cursor: null }),
      };
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.FIREWALL_BYPASS_TOKEN;
});

describe("catalogue tooling fetches", () => {
  it("sends the bypass header when FIREWALL_BYPASS_TOKEN is set", async () => {
    process.env.FIREWALL_BYPASS_TOKEN = "test-token";
    await fetchManifest("https://example.test/api/items");
    await fetchAllItems("https://example.test/api/items");
    expect(seen).toHaveLength(2);
    for (const call of seen) {
      expect(call.headers["x-tranquilo-bypass"]).toBe("test-token");
    }
  });

  it("sends no bypass header when the variable is unset", async () => {
    await fetchManifest("https://example.test/api/items");
    await fetchAllItems("https://example.test/api/items");
    for (const call of seen) {
      expect(call.headers["x-tranquilo-bypass"]).toBeUndefined();
    }
  });
});
