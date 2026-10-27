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
  // Manifest entries are "source:id" strings here.
  function stubCatalogue(entries: string[], pageSize: number) {
    const urls: URL[] = [];
    const split = (key: string) => {
      const cut = key.indexOf(":");
      return { source: key.slice(0, cut), id: key.slice(cut + 1) };
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        const url = new URL(input);
        urls.push(url);
        const lookup = url.searchParams.getAll("keys");
        if (lookup.length) {
          return new Response(
            JSON.stringify({
              items: lookup.map((key) => ({
                ...split(key),
                title: `Item ${key}`,
              })),
              missing: [],
            }),
          );
        }
        const at = Number(url.searchParams.get("cursor") ?? 0);
        const next =
          at + pageSize < entries.length ? String(at + pageSize) : null;
        return new Response(
          JSON.stringify({
            items: entries.slice(at, at + pageSize).map(split),
            next_cursor: next,
          }),
        );
      }),
    );
    return urls;
  }

  it("resolves every manifest entry to a full row, at most 100 keys per lookup", async () => {
    const entries = Array.from({ length: 250 }, (_, i) => `met:n${i}`);
    const urls = stubCatalogue(entries, 200);

    const items = await fetchAllItems(API);

    expect(
      items.map((i: { source: string; id: string }) => `${i.source}:${i.id}`),
    ).toEqual(entries);
    expect(items[0].title).toBe("Item met:n0");
    const lookups = urls.filter((u) => u.searchParams.has("keys"));
    expect(lookups.length).toBeGreaterThan(0);
    for (const url of lookups) {
      expect(url.searchParams.getAll("keys").length).toBeLessThanOrEqual(100);
    }
    expect(urls.some((u) => u.searchParams.has("ids"))).toBe(false);
    expect(
      urls.some(
        (u) => u.searchParams.has("limit") && !u.searchParams.has("shape"),
      ),
    ).toBe(false);
  });

  it("returns one row per source when two sources share a native id", async () => {
    stubCatalogue(["met:1", "cleveland:1"], 200);
    const items = await fetchAllItems(API);
    expect(
      items.map((i: { source: string; title: string }) => i.title),
    ).toEqual(["Item met:1", "Item cleveland:1"]);
  });

  it("fails loudly when a lookup reports missing keys", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        const url = new URL(input);
        return new Response(
          JSON.stringify(
            url.searchParams.has("keys")
              ? { items: [], missing: url.searchParams.getAll("keys") }
              : { items: [{ source: "met", id: "gone" }], next_cursor: null },
          ),
        );
      }),
    );
    await expect(fetchAllItems(API)).rejects.toThrow(/met:gone/);
  });
});
