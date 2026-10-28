// A hero shelf entry may name its source; the preview counts and covers the
// named source's item, not another source's item with the same native id.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getShelfPreview, type Shelf } from "../lib/shelves.ts";
import { makeSql } from "./helpers/pg.ts";

type Sql = Awaited<ReturnType<typeof makeSql>>;
let sql: Sql;
beforeAll(async () => {
  sql = await makeSql(["001_items_schema.sql", "003_items_harmonization.sql"]);
  for (const [source, nativeId] of [
    ["met", "7"],
    ["cleveland", "7"],
    ["npm", "8"],
  ]) {
    await sql.query(
      "INSERT INTO items (id, source, native_id, title, category) VALUES ($1, $2, $3, 't', 'Painting')",
      [`${source}:${nativeId}`, source, nativeId],
    );
  }
});
afterAll(async () => {
  if (sql) await sql.$close();
});

const shelf = (itemIds: NonNullable<Shelf["itemIds"]>) => ({
  id: "s",
  slug: "s",
  title: "s",
  type: "hero",
  itemIds,
});

describe("getShelfPreview with source-qualified entries", () => {
  it("covers with the named source's item", async () => {
    const { count, cover } = await getShelfPreview(
      sql,
      shelf([{ id: "7", source: "cleveland" }, 8]),
    );
    expect(count).toBe(2);
    expect(cover?.source).toBe("cleveland");
  });

  it("still resolves bare ids and skips entries that match nothing", async () => {
    const { count, cover } = await getShelfPreview(
      sql,
      shelf(["404", 8, { id: "7", source: "npm" }]),
    );
    expect(count).toBe(1);
    expect(cover?.native_id).toBe("8");
  });
});
