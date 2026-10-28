// sql/054 names a source on every curated entry whose id is unambiguous, and
// resolves the one known shared id by hand.
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeSql } from "./helpers/pg.ts";

type Sql = Awaited<ReturnType<typeof makeSql>>;
let sql: Sql;
const migration = readFileSync("sql/054_curated_entry_sources.sql", "utf8");

async function chapters(id: string) {
  const rows = await sql.query("SELECT items FROM storylines WHERE id = $1", [
    id,
  ]);
  return (rows[0].items as { id: string; source?: string }[]).map((c) => [
    c.id,
    c.source,
  ]);
}

beforeAll(async () => {
  sql = await makeSql([
    "001_items_schema.sql",
    "019_storylines.sql",
    "034_set_of_works.sql",
  ]);
  for (const [source, nativeId] of [
    ["met", "437534"],
    ["cleveland", "437534"],
    ["met", "1"],
    ["cleveland", "2"],
    ["cleveland", "3"],
    ["npm", "3"],
  ]) {
    await sql.query(
      "INSERT INTO items (id, source, native_id, title, category) VALUES ($1, $2, $3, 't', 'Painting')",
      [`${source}:${nativeId}`, source, nativeId],
    );
  }
  await sql.query(
    "INSERT INTO storylines (id, title, type, tier, cover_item_id, intro_caption, items) VALUES ($1, 't', 'x', 'structural', '1', 'c', $2::jsonb)",
    [
      "rubens-workshop",
      JSON.stringify([
        { id: "1", position: 1 },
        { id: "437534", position: 2 },
        { id: "3", position: 3 },
        { id: "404", position: 4 },
        { id: "2", source: "cleveland", position: 5 },
      ]),
    ],
  );
  await sql.query(
    "INSERT INTO set_of_works (id, title, items) VALUES ('s', 't', $1::jsonb)",
    [JSON.stringify([{ id: "1", distinguishing_trait: "a" }, { id: "3" }])],
  );
  await sql.$db.exec(migration);
});
afterAll(async () => {
  if (sql) await sql.$close();
});

describe("054 curated entry sources", () => {
  it("names the source of an id only one source holds, and keeps order", async () => {
    expect((await chapters("rubens-workshop")).map((c) => c[0])).toEqual([
      "1",
      "437534",
      "3",
      "404",
      "2",
    ]);
    expect((await chapters("rubens-workshop"))[0]).toEqual(["1", "met"]);
  });

  it("resolves the known shared id by hand", async () => {
    expect((await chapters("rubens-workshop"))[1]).toEqual(["437534", "met"]);
  });

  it("leaves other shared and unknown ids bare, and keeps existing sources", async () => {
    const rows = await chapters("rubens-workshop");
    expect(rows[2]).toEqual(["3", undefined]);
    expect(rows[3]).toEqual(["404", undefined]);
    expect(rows[4]).toEqual(["2", "cleveland"]);
  });

  it("names set members too, keeping their other fields", async () => {
    const rows = await sql.query("SELECT items FROM set_of_works");
    expect(rows[0].items).toEqual([
      { id: "1", source: "met", distinguishing_trait: "a" },
      { id: "3" },
    ]);
  });

  it("is re-runnable", async () => {
    const before = await chapters("rubens-workshop");
    await sql.$db.exec(migration);
    expect(await chapters("rubens-workshop")).toEqual(before);
  });
});
