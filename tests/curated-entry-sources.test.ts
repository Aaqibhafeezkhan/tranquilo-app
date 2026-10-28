// Native ids repeat across sources, so a curated entry can name its source.
// The server passes that source through; the client resolves such entries by
// source:native_id and falls back to the bare id for entries without one.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getSetOfWork, getSetOfWorksIndex } from "../lib/setOfWorks.ts";
import { getStoryline, getStorylineIndex } from "../lib/storylines.ts";
import {
  curatedKey,
  findCuratedItem,
  resolveCuratedItems,
  resolveCuratedList,
  sameCuratedItem,
} from "../src/feed/curatedEntries.ts";
import type { Item } from "../src/types/Item";
import { makeSql } from "./helpers/pg.ts";

type Sql = Awaited<ReturnType<typeof makeSql>>;
let sql: Sql;
beforeAll(async () => {
  sql = await makeSql(["019_storylines.sql", "034_set_of_works.sql"]);
  await sql.query(
    "INSERT INTO storylines (id, title, type, tier, cover_item_id, intro_caption, items) VALUES ($1, 't', 'x', 'structural', $2, 'c', $3::jsonb)",
    [
      "rubens",
      "437534",
      JSON.stringify([
        { id: "1", position: 1, chapter_caption: "a" },
        { id: "437534", source: "met", position: 2, chapter_caption: "b" },
      ]),
    ],
  );
  await sql.query(
    "INSERT INTO storylines (id, title, type, tier, cover_item_id, intro_caption, items) VALUES ($1, 't', 'x', 'structural', $2, 'c', $3::jsonb)",
    [
      "plain",
      "9",
      JSON.stringify([{ id: "9", position: 1, chapter_caption: "a" }]),
    ],
  );
  await sql.query(
    "INSERT INTO set_of_works (id, title, items) VALUES ($1, 't', $2::jsonb)",
    [
      "set",
      JSON.stringify([
        { id: "5", source: "met", distinguishing_trait: "x" },
        { id: "6", distinguishing_trait: "y" },
      ]),
    ],
  );
});
afterAll(async () => {
  if (sql) await sql.$close();
});

describe("storyline entries name their source", () => {
  it("the index carries each chapter's source and the cover's source", async () => {
    const index = await getStorylineIndex(sql);
    const rubens = index.find((s: { id: string }) => s.id === "rubens");
    expect(rubens.items).toEqual([
      { id: "1", position: 1 },
      { id: "437534", source: "met", position: 2 },
    ]);
    expect(rubens.cover_source).toBe("met");
  });

  it("a cover that no chapter names has no source", async () => {
    const index = await getStorylineIndex(sql);
    const plain = index.find((s: { id: string }) => s.id === "plain");
    expect(plain.cover_source).toBeUndefined();
  });

  it("the full storyline keeps chapter sources and adds the cover's", async () => {
    const full = await getStoryline(sql, "rubens");
    expect(full.items[1].source).toBe("met");
    expect(full.cover_source).toBe("met");
  });
});

describe("set-of-works entries name their source", () => {
  it("the index and the detail both carry member sources", async () => {
    const index = await getSetOfWorksIndex(sql);
    expect(index[0].items).toEqual([{ id: "5", source: "met" }, { id: "6" }]);
    const full = await getSetOfWork(sql, "set");
    expect(full.items[0].source).toBe("met");
  });
});

describe("client resolution of curated entries", () => {
  const met = { source: "met", id: "7" } as Item;
  const cleveland = { source: "cleveland", id: "7" } as Item;
  const host = () => ({
    getItem: vi.fn((id: string) => (id === "7" ? cleveland : undefined)),
    getItemByKey: vi.fn((key: string) =>
      key === "met:7" ? met : key === "cleveland:7" ? cleveland : undefined,
    ),
    resolveItemsByIds: vi.fn(async () => []),
    resolveItemsByKeys: vi.fn(async () => []),
  });

  it("an entry with a source is keyed; one without is not", () => {
    expect(curatedKey({ id: "7", source: "met" })).toBe("met:7");
    expect(curatedKey({ id: 7 })).toBeNull();
  });

  it("finds the named source's item even when another source shares the id", () => {
    expect(findCuratedItem(host(), { id: "7", source: "met" })).toBe(met);
  });

  it("falls back to the bare id for an entry without a source", () => {
    expect(findCuratedItem(host(), { id: 7 })).toBe(cleveland);
  });

  it("resolves keyed entries by key and bare entries by id, in one pass", async () => {
    const h = host();
    await resolveCuratedItems(h, [
      { id: "7", source: "met" },
      { id: 8 },
      { id: "9", source: "npm" },
    ]);
    expect(h.resolveItemsByKeys).toHaveBeenCalledWith(["met:7", "npm:9"]);
    expect(h.resolveItemsByIds).toHaveBeenCalledWith(["8"]);
  });

  it("matches an item to its entry by source when the entry names one", () => {
    expect(sameCuratedItem({ id: "7", source: "met" }, met)).toBe(true);
    expect(sameCuratedItem({ id: "7", source: "met" }, cleveland)).toBe(false);
    expect(sameCuratedItem({ id: 7 }, cleveland)).toBe(true);
  });

  it("lists mixed entries in the order given, each from its own source", async () => {
    const h = host();
    h.resolveItemsByKeys.mockResolvedValue([met] as never);
    h.resolveItemsByIds.mockResolvedValue([cleveland] as never);
    const out = await resolveCuratedList(h, [
      { id: 7 },
      { id: "7", source: "met" },
      { id: "gone", source: "met" },
    ]);
    expect(out).toEqual([cleveland, met]);
  });

  it("skips the lookup that has nothing to ask for", async () => {
    const h = host();
    await resolveCuratedItems(h, [{ id: "7", source: "met" }]);
    expect(h.resolveItemsByIds).not.toHaveBeenCalled();
  });
});
