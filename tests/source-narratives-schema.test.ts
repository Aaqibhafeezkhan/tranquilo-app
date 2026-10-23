// source_narratives holds a working copy of museum-written text for an item.
// Checked against real Postgres (PGlite), seeded from the migration files.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeSql } from "./helpers/pg.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION = "048_source_narratives.sql";

async function insertItem(sql: any, id: string) {
  const [source, nativeId] = id.split(":");
  await sql.query(
    "INSERT INTO items (id, source, native_id, title, category) VALUES ($1, $2, $3, $4, 'Painting')",
    [id, source, nativeId, `Test ${nativeId}`],
  );
}

async function insertNarrative(sql: any, itemId: string, extra: any = {}) {
  const row = {
    item_id: itemId,
    source: itemId.split(":")[0],
    license: "CC BY 4.0",
    language: "en",
    body_html: "<p>Text</p>",
    body_text: "Text",
    content_hash: "abc",
    fetched_at: new Date().toISOString(),
    ...extra,
  };
  const cols = Object.keys(row);
  return sql.query(
    `INSERT INTO source_narratives (${cols.join(", ")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")})`,
    cols.map((c) => (row as any)[c]),
  );
}

let sql: any;
beforeAll(async () => {
  sql = await makeSql([
    "001_items_schema.sql",
    "003_items_harmonization.sql",
    MIGRATION,
  ]);
  await insertItem(sql, "tepapa:1");
  await insertItem(sql, "tepapa:2");
  await insertItem(sql, "tepapa:3");
});
afterAll(async () => {
  if (sql) await sql.$close();
});

describe("source_narratives", () => {
  it("marks a narrative with no source publication as quotable", async () => {
    await insertNarrative(sql, "tepapa:1");
    const [row] = await sql.query(
      "SELECT quotable, footnotes FROM source_narratives WHERE item_id = 'tepapa:1'",
    );
    expect(row.quotable).toBe(true);
    expect(row.footnotes).toEqual([]);
  });

  it("never marks a book extract as quotable", async () => {
    await insertNarrative(sql, "tepapa:2", {
      publication_title: "Te Ata o Tū",
      publisher: "Te Papa Press",
      acquisition_url: "https://www.tepapa.govt.nz/about/te-papa-press/x",
    });
    const [row] = await sql.query(
      "SELECT quotable FROM source_narratives WHERE item_id = 'tepapa:2'",
    );
    expect(row.quotable).toBe(false);
  });

  it("requires the language the text is written in", async () => {
    await insertItem(sql, "tepapa:4");
    await expect(
      insertNarrative(sql, "tepapa:4", { language: null }),
    ).rejects.toThrow();
  });

  it("rejects a narrative for an item that does not exist", async () => {
    await expect(insertNarrative(sql, "tepapa:999")).rejects.toThrow();
  });

  it("holds at most one narrative per item", async () => {
    await insertNarrative(sql, "tepapa:3");
    await expect(insertNarrative(sql, "tepapa:3")).rejects.toThrow();
  });

  it("is removed with its item", async () => {
    await sql.query("DELETE FROM items WHERE id = 'tepapa:3'");
    const rows = await sql.query(
      "SELECT 1 FROM source_narratives WHERE item_id = 'tepapa:3'",
    );
    expect(rows).toHaveLength(0);
  });

  it("can be re-run without error", async () => {
    const twice = await makeSql([
      "001_items_schema.sql",
      "003_items_harmonization.sql",
      MIGRATION,
      MIGRATION,
    ]);
    await twice.$close();
  });

  it("is mirrored verbatim in a prisma migration", () => {
    const sqlFile = readFileSync(
      path.join(__dirname, "..", "sql", MIGRATION),
      "utf8",
    );
    const prismaFile = readFileSync(
      path.join(
        __dirname,
        "..",
        "prisma",
        "migrations",
        "20261023120000_source_narratives",
        "migration.sql",
      ),
      "utf8",
    );
    const statements = (s: string) =>
      s
        .split("\n")
        .filter((l) => !l.trim().startsWith("--"))
        .join("\n")
        .trim();
    expect(statements(prismaFile)).toBe(statements(sqlFile));
  });
});
