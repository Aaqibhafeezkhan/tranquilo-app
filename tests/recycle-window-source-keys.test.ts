// Native ids repeat across sources, so hydration must fetch and merge by
// source:native_id: a row for cleveland:107208 must never land on the
// met:107208 object, whichever order the lookup returns them in.
import { describe, expect, it, vi } from "vitest";
import { CatalogueCache } from "../src/app/CatalogueCache";
import { createRecycleWindow } from "../src/feed/recycleWindow";
import type { Item } from "../src/types/Item";

const FULL: Record<string, Partial<Item>> = {
  "met:107208": { source: "met", id: "107208", title: "Met work" },
  "cleveland:107208": {
    source: "cleveland",
    id: "107208",
    title: "Cleveland work",
  },
};

function setup() {
  const cache = new CatalogueCache();
  const [met, cleveland] = cache.absorbPage([
    { source: "met", id: "107208" },
    { source: "cleveland", id: "107208" },
  ]);
  const fetchItemsByKeys = vi.fn(async (keys: string[]) => ({
    items: keys.map((k) => ({ ...FULL[k] }) as Item),
    missing: [] as string[],
  }));
  // Both sources' rows for any bare id, as ?ids= answers.
  const fetchItemsByIds = vi.fn(async () => ({
    items: [
      { ...FULL["cleveland:107208"] },
      { ...FULL["met:107208"] },
    ] as Item[],
    missing: [],
  }));
  const host = {
    fetchFeedPage: vi.fn(),
    fetchItemsByIds,
    fetchItemsByKeys,
    absorbPage: (rows: Item[]) => cache.absorbPage(rows),
    buildSlideContents: vi.fn(),
    maybeLoadMoreSlides: vi.fn(),
    onWindowUpdated: vi.fn(),
  };
  const win = createRecycleWindow(host as never, {
    feedEl: {} as HTMLElement,
    items: cache.items,
    itemsById: cache.itemsById,
    itemsByKey: cache.itemsByKey,
    slideRecords: [],
    feedPageSize: 40,
  });
  return { win, host, met, cleveland, fetchItemsByKeys, fetchItemsByIds };
}

describe("hydration with a native id shared by two sources", () => {
  it("hydrateItems asks by source:native_id and fills each item from its own row", async () => {
    const { win, met, cleveland, fetchItemsByKeys } = setup();
    await win.hydrateItems([met, cleveland]);
    expect(fetchItemsByKeys).toHaveBeenCalledWith([
      "met:107208",
      "cleveland:107208",
    ]);
    expect(met.title).toBe("Met work");
    expect(met.source).toBe("met");
    expect(cleveland.title).toBe("Cleveland work");
    expect(cleveland.source).toBe("cleveland");
  });

  it("the feed's hydration batch fills each item from its own row", async () => {
    const { win, met, cleveland } = setup();
    win.fetchHydrationBatch(["met:107208", "cleveland:107208"]);
    await vi.waitFor(() => expect(met._full && cleveland._full).toBe(true));
    expect(met.title).toBe("Met work");
    expect(cleveland.title).toBe("Cleveland work");
  });

  it("resolveItemsByIds never merges one source's row into another's item", async () => {
    const { win, met, cleveland } = setup();
    await win.resolveItemsByIds(["107208"]);
    expect(met.title).toBe("Met work");
    expect(met.source).toBe("met");
    expect(cleveland.title).toBe("Cleveland work");
    expect(cleveland.source).toBe("cleveland");
  });

  it("resolveItemsByKeys returns exactly the named items, in order", async () => {
    const { win, met, cleveland, fetchItemsByKeys } = setup();
    const rows = await win.resolveItemsByKeys([
      "cleveland:107208",
      "met:107208",
    ]);
    expect(fetchItemsByKeys).toHaveBeenCalledWith([
      "cleveland:107208",
      "met:107208",
    ]);
    expect(rows).toEqual([cleveland, met]);
    expect(cleveland.title).toBe("Cleveland work");
    expect(met.title).toBe("Met work");
  });

  it("resolveItemsByKeys adopts an item the feed has never met", async () => {
    const { win, fetchItemsByKeys } = setup();
    fetchItemsByKeys.mockResolvedValueOnce({
      items: [{ source: "npm", id: "U:1", title: "New" } as Item],
      missing: ["met:404"],
    });
    const rows = await win.resolveItemsByKeys(["npm:U:1", "met:404"]);
    expect(rows.map((i) => [i.source, i.id, i.title, i._full])).toEqual([
      ["npm", "U:1", "New", true],
    ]);
    const again = await win.resolveItemsByKeys(["npm:U:1"]);
    expect(again[0]).toBe(rows[0]);
    expect(fetchItemsByKeys).toHaveBeenCalledTimes(1);
  });

  it("a pager's exclusions name one source's item, not every item with that id", async () => {
    const { win, host } = setup();
    host.fetchFeedPage.mockResolvedValueOnce({
      items: [
        { source: "met", id: "107208" },
        { source: "cleveland", id: "107208" },
      ],
      next_cursor: null,
    });
    const pager = win.createPager({}, false, { "met:107208": true });
    const page = await win.loadNextPage(pager);
    expect(page.map((i) => `${i.source}:${i.id}`)).toEqual([
      "cleveland:107208",
    ]);
  });
});
