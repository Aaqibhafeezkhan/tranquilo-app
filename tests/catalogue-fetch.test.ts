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

const API = "https://example.test/api/items";

function stubPages(
  pages: Record<string, { items: unknown[]; next_cursor: string | null }>,
) {
  const urls: URL[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const url = new URL(input);
      urls.push(url);
      const body = pages[url.searchParams.get("cursor") ?? ""];
      return new Response(JSON.stringify(body), { status: body ? 200 : 404 });
    }),
  );
  return urls;
}

describe("fetchManifest", () => {
  it("follows shuffle-paged manifest cursors until the last page", async () => {
    const urls = stubPages({
      "": { items: [{ id: "1" }, { id: "2" }], next_cursor: "c1" },
      c1: { items: [{ id: "3" }], next_cursor: "c2" },
      c2: { items: [], next_cursor: null },
    });

    const manifest = await fetchManifest(API);

    expect(manifest.map((i: { id: string }) => i.id)).toEqual(["1", "2", "3"]);
    for (const url of urls) {
      expect(url.searchParams.get("shape")).toBe("manifest");
      expect(url.searchParams.get("order")).toBe("shuffle");
      expect(Number(url.searchParams.get("limit"))).toBeGreaterThan(0);
    }
    expect(urls[0].searchParams.get("start")).toBe("0");
  });

  it("fails loudly when the cursor stops advancing", async () => {
    stubPages({
      "": { items: [{ id: "1" }], next_cursor: "c1" },
      c1: { items: [{ id: "2" }], next_cursor: "c1" },
    });
    await expect(fetchManifest(API)).rejects.toThrow(
      /cursor stopped advancing/,
    );
  });

  it("surfaces an HTTP error", async () => {
    stubPages({});
    await expect(fetchManifest(API)).rejects.toThrow(/404/);
  });
});

describe("fetchAllItems", () => {
  function stubCatalogue(ids: string[], pageSize: number) {
    const urls: URL[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        const url = new URL(input);
        urls.push(url);
        const lookup = url.searchParams.getAll("ids");
        if (lookup.length) {
          return new Response(
            JSON.stringify({
              items: lookup.map((id) => ({ id, title: `Item ${id}` })),
              missing: [],
            }),
          );
        }
        const at = Number(url.searchParams.get("cursor") ?? 0);
        const next = at + pageSize < ids.length ? String(at + pageSize) : null;
        return new Response(
          JSON.stringify({
            items: ids.slice(at, at + pageSize).map((id) => ({ id })),
            next_cursor: next,
          }),
        );
      }),
    );
    return urls;
  }

  it("resolves every manifest id to a full row, at most 100 ids per lookup", async () => {
    const ids = Array.from({ length: 250 }, (_, i) => `n${i}`);
    const urls = stubCatalogue(ids, 200);

    const items = await fetchAllItems(API);

    expect(items.map((i: { id: string }) => i.id).sort()).toEqual(
      [...ids].sort(),
    );
    expect(items[0].title).toBe("Item n0");
    const lookups = urls.filter((u) => u.searchParams.has("ids"));
    expect(lookups.length).toBeGreaterThan(0);
    for (const url of lookups) {
      expect(url.searchParams.getAll("ids").length).toBeLessThanOrEqual(100);
    }
    expect(
      urls.some(
        (u) => u.searchParams.has("limit") && !u.searchParams.has("shape"),
      ),
    ).toBe(false);
  });

  it("fails loudly when a lookup reports missing ids", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        const url = new URL(input);
        return new Response(
          JSON.stringify(
            url.searchParams.has("ids")
              ? { items: [], missing: url.searchParams.getAll("ids") }
              : { items: [{ id: "gone" }], next_cursor: null },
          ),
        );
      }),
    );
    await expect(fetchAllItems(API)).rejects.toThrow(/gone/);
  });
});
