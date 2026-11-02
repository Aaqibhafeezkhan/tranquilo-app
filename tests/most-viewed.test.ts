import { beforeEach, describe, expect, it } from "vitest";
import { mostViewedArtworks } from "../lib/most-viewed";
import { makeSql } from "./helpers/pg";

describe("mostViewedArtworks", () => {
  let sql: Awaited<ReturnType<typeof makeSql>>;

  beforeEach(async () => {
    sql = await makeSql([
      "001_items_schema.sql",
      "002_analytics_events.sql",
      "003_items_harmonization.sql",
      "004_items_rejected_state.sql",
    ]);
  });

  async function insertItem(
    source: string,
    nativeId: string,
    extra: Record<string, unknown> = {},
  ) {
    const row = {
      id: `${source}:${nativeId}`,
      source,
      native_id: nativeId,
      title: `Title ${nativeId}`,
      artist: `Artist ${nativeId}`,
      category: "Painting",
      full_img: `https://images.example.org/${nativeId}.jpg`,
      ...extra,
    };
    const cols = Object.keys(row);
    await sql.query(
      `INSERT INTO items (${cols.join(", ")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")})`,
      cols.map((c) => (row as Record<string, unknown>)[c]),
    );
  }

  async function view(
    source: string,
    itemId: string,
    pageLoadId: string,
    createdAt = "now()",
    eventName = "artwork_view",
  ) {
    await sql.query(
      `INSERT INTO analytics_events (event_name, props, created_at)
       VALUES ($1, $2::jsonb, ${createdAt})`,
      [
        eventName,
        JSON.stringify({
          source,
          item_id: itemId,
          page_load_id: pageLoadId,
        }),
      ],
    );
  }

  it("ranks items by distinct page loads, most first", async () => {
    await insertItem("met", "1");
    await insertItem("met", "2");
    await view("met", "1", "a");
    await view("met", "2", "a");
    await view("met", "2", "b");
    const rows = await mostViewedArtworks(sql, { limit: 10 });
    expect(rows.map((r) => r.native_id)).toEqual(["2", "1"]);
    expect(rows.map((r) => Number(r.views))).toEqual([2, 1]);
  });

  it("counts a page load once however many events it sent", async () => {
    await insertItem("met", "1");
    await view("met", "1", "a");
    await view("met", "1", "a");
    await view("met", "1", "a");
    const rows = await mostViewedArtworks(sql, { limit: 10 });
    expect(Number(rows[0].views)).toBe(1);
  });

  it("keeps the same native id from two sources apart", async () => {
    await insertItem("met", "7");
    await insertItem("aic", "7");
    await view("met", "7", "a");
    await view("aic", "7", "a");
    await view("aic", "7", "b");
    const rows = await mostViewedArtworks(sql, { limit: 10 });
    expect(rows.map((r) => `${r.source}:${r.native_id}`)).toEqual([
      "aic:7",
      "met:7",
    ]);
  });

  it("ignores other event names", async () => {
    await insertItem("met", "1");
    await view("met", "1", "a", "now()", "feed_depth");
    expect(await mostViewedArtworks(sql, { limit: 10 })).toEqual([]);
  });

  it("leaves out items that are not live in the catalogue", async () => {
    await insertItem("met", "1", { review_status: "rejected" });
    await insertItem("met", "2", { category: "Photography" });
    await insertItem("met", "3");
    await view("met", "1", "a");
    await view("met", "2", "a");
    await view("met", "3", "a");
    const rows = await mostViewedArtworks(sql, { limit: 10 });
    expect(rows.map((r) => r.native_id)).toEqual(["3"]);
  });

  it("only counts events since the given date", async () => {
    await insertItem("met", "1");
    await view("met", "1", "old", "now() - interval '10 days'");
    await view("met", "1", "new");
    const rows = await mostViewedArtworks(sql, {
      limit: 10,
      since: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    });
    expect(Number(rows[0].views)).toBe(1);
  });

  it("respects the limit", async () => {
    await insertItem("met", "1");
    await insertItem("met", "2");
    await view("met", "1", "a");
    await view("met", "2", "a");
    expect(await mostViewedArtworks(sql, { limit: 1 })).toHaveLength(1);
  });

  it("ignores events with no page load id", async () => {
    await insertItem("met", "1");
    await sql.query(
      `INSERT INTO analytics_events (event_name, props) VALUES ('artwork_view', $1::jsonb)`,
      [JSON.stringify({ source: "met", item_id: "1" })],
    );
    expect(await mostViewedArtworks(sql, { limit: 10 })).toEqual([]);
  });
});
