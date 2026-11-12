// The first hydration lookup covers only slides near the viewer.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CatalogueCache } from "../src/app/CatalogueCache";
import { createRecycleWindow } from "../src/feed/recycleWindow";
import type { Item } from "../src/types/Item";

function setup(count: number) {
  const cache = new CatalogueCache();
  const rows = Array.from({ length: count }, (_, i) => ({
    source: "met",
    id: String(i),
  }));
  const absorbed = cache.absorbPage(rows as Item[]);
  const slideRecords = absorbed.map((item) => ({
    el: {} as HTMLElement,
    item,
    permanent: false,
    hydrated: false,
  }));
  const fetchItemsByKeys = vi.fn(async (keys: string[]) => ({
    items: keys.map((k) => {
      const [source, id] = k.split(":");
      return { source, id, title: `t${id}` } as Item;
    }),
    missing: [] as string[],
  }));
  const host = {
    fetchFeedPage: vi.fn(),
    fetchItemsByIds: vi.fn(),
    fetchItemsByKeys,
    absorbPage: (r: Item[]) => cache.absorbPage(r),
    buildSlideContents: vi.fn(),
    maybeLoadMoreSlides: vi.fn(),
    onWindowUpdated: vi.fn(),
  };
  const win = createRecycleWindow(host as never, {
    feedEl: { clientHeight: 800, scrollTop: 0 } as HTMLElement,
    items: cache.items,
    itemsById: cache.itemsById,
    itemsByKey: cache.itemsByKey,
    slideRecords: slideRecords as never,
    feedPageSize: 60,
  });
  return { win, fetchItemsByKeys };
}

describe("first hydration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("asks first for only the slides around the viewer", async () => {
    const { win, fetchItemsByKeys } = setup(60);
    win.updateRecycleWindow();
    expect(fetchItemsByKeys).toHaveBeenCalledTimes(1);
    const firstKeys = fetchItemsByKeys.mock.calls[0][0];
    expect(firstKeys.length).toBeLessThanOrEqual(6);
    expect(firstKeys).toContain("met:0");
  });

  it("still fetches the rest of the window afterwards, without repeating keys", async () => {
    const { win, fetchItemsByKeys } = setup(60);
    win.updateRecycleWindow();
    await vi.advanceTimersByTimeAsync(500);
    const all = fetchItemsByKeys.mock.calls.flatMap((c) => c[0]);
    expect(new Set(all).size).toBe(all.length);
    expect(all).toContain("met:30");
    expect(all.length).toBeGreaterThan(20);
  });
});
