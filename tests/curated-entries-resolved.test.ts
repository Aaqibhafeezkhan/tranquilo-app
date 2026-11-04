import { describe, expect, it } from "vitest";
import {
  type CuratedLookupHost,
  renumberResolved,
} from "../src/feed/curatedEntries";
import type { Item } from "../src/types/Item";

function hostWith(
  keys: string[],
): Pick<CuratedLookupHost, "getItem" | "getItemByKey"> {
  const have = new Set(keys);
  return {
    getItem: (id) => (have.has(id) ? ({ id } as unknown as Item) : undefined),
    getItemByKey: (key) =>
      have.has(key) ? ({ id: key } as unknown as Item) : undefined,
  };
}

describe("renumberResolved", () => {
  it("drops entries whose item cannot be found", () => {
    const entries = [
      { id: 1, position: 1 },
      { id: 2, position: 2 },
      { id: 3, position: 3 },
    ];
    const kept = renumberResolved(hostWith(["1", "3"]), entries);
    expect(kept.map((e) => e.id)).toEqual([1, 3]);
  });

  it("renumbers positions to stay contiguous from 1", () => {
    const entries = [
      { id: 1, position: 1 },
      { id: 2, position: 2 },
      { id: 3, position: 3 },
    ];
    const kept = renumberResolved(hostWith(["1", "3"]), entries);
    expect(kept.map((e) => e.position)).toEqual([1, 2]);
  });

  it("resolves source-qualified entries by key", () => {
    const entries = [
      { id: 7, source: "met", position: 1 },
      { id: 8, source: "met", position: 2 },
    ];
    const kept = renumberResolved(hostWith(["met:8"]), entries);
    expect(kept).toEqual([{ id: 8, source: "met", position: 1 }]);
  });

  it("keeps other fields and does not mutate its input", () => {
    const entries = [{ id: 1, position: 4, chapter_caption: "kept" }];
    const kept = renumberResolved(hostWith(["1"]), entries);
    expect(kept[0].chapter_caption).toBe("kept");
    expect(entries[0].position).toBe(4);
  });

  it("returns an empty list when nothing resolves", () => {
    expect(renumberResolved(hostWith([]), [{ id: 1, position: 1 }])).toEqual(
      [],
    );
  });
});
