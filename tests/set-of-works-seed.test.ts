// The reviewed Sets of works seeded by sql/046. Each member's id must be a
// bare native_id (see 034's header), and the items-side badge column must
// point back at the set, scoped to the right source so an unrelated item
// sharing a native_id elsewhere is never badged.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getSetOfWork, getSetOfWorksIndex } from "../lib/setOfWorks.ts";
import { makeSql } from "./helpers/pg.ts";

const SETS: Record<string, { source: string; ids: string[] }> = {
  "set-kocx-flower-pyramid": {
    source: "cleveland",
    ids: [
      "675579",
      "675812",
      "675813",
      "675814",
      "675815",
      "675816",
      "675817",
      "675818",
    ],
  },
  "set-blooteling-various-lions": {
    source: "cleveland",
    ids: ["163884", "163885", "163886", "163887"],
  },
  "set-philadelphia-sunday-press": {
    source: "met",
    ids: ["339068", "339069", "339070", "339071"],
  },
};

let sql: any;
beforeAll(async () => {
  sql = await makeSql([
    "001_items_schema.sql",
    "033_items_set_of_work_id.sql",
    "034_set_of_works.sql",
  ]);
  for (const { source, ids } of Object.values(SETS)) {
    for (const id of ids) {
      await sql.query(
        "INSERT INTO items (id, source, native_id, title) VALUES ($1, $2, $3, 'x')",
        [`${source}:${id}`, source, id],
      );
    }
  }
  // Same native_id as a set member, different source: must stay unbadged.
  await sql.query(
    "INSERT INTO items (id, source, native_id, title) VALUES ('met:675579', 'met', '675579', 'x')",
  );
  // The lions' whole-set record duplicates the title plate: not a member.
  await sql.query(
    "INSERT INTO items (id, source, native_id, title) VALUES ('cleveland:163883', 'cleveland', '163883', 'x')",
  );
  const text = readFileSync(
    join(
      import.meta.dirname,
      "..",
      "sql",
      "046_set_of_works_seed_prints_and_delftware.sql",
    ),
    "utf8",
  );
  // Twice, to prove it is safe to re-run.
  await sql.$db.exec(text);
  await sql.$db.exec(text);
});
afterAll(async () => {
  if (sql) await sql.$close();
});

describe("Sets of works seeded from review", () => {
  it("lists every member in display order with a trait, by bare native_id", async () => {
    for (const [id, { ids }] of Object.entries(SETS)) {
      const set = await getSetOfWork(sql, id);
      expect(set, id).toBeTruthy();
      expect(set.items.map((m: any) => m.id)).toEqual(ids);
      for (const member of set.items) {
        expect(member.id).not.toContain(":");
        expect(member.distinguishing_trait.length).toBeGreaterThan(10);
        expect(member.distinguishing_trait).not.toContain("—");
      }
    }
  });

  it("appears in the badge index once per set", async () => {
    const index = await getSetOfWorksIndex(sql);
    expect(index.map((s: any) => s.id).sort()).toEqual(
      Object.keys(SETS).sort(),
    );
  });

  it("badges each member, and only members, from the right source", async () => {
    const rows = await sql.query(
      "SELECT source, native_id, set_of_work_id FROM items ORDER BY id",
    );
    for (const row of rows) {
      const expected = Object.entries(SETS).find(
        ([, s]) => s.source === row.source && s.ids.includes(row.native_id),
      );
      expect(row.set_of_work_id, `${row.source}:${row.native_id}`).toBe(
        expected ? expected[0] : null,
      );
    }
  });
});
