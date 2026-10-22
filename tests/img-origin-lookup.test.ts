// The image proxy fetches whatever URL lookupOriginUrl() returns and
// caches it under the item's key. It once trusted the request's own
// `?origin=` instead, so two requests with a URL of the caller's choosing
// swapped the picture every later visitor saw for that item. These pin the
// lookup to the item's row, against real Postgres (PGlite).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { makeSql } from "./helpers/pg.ts";

vi.mock("../lib/sentry.ts", () => ({
  Sentry: {},
  reportError: vi.fn(),
}));

const proxy = await import("../api/img/[source]/[id]/[tier].ts");

function insertItem(sql: any, nativeId: string, overrides: any = {}) {
  const row = {
    id: `met:${nativeId}`,
    source: "met",
    native_id: nativeId,
    title: `Test ${nativeId}`,
    category: "Painting", // category != 'Photography' is NULL for a NULL category
    img: `https://images.metmuseum.org/web-large/${nativeId}.jpg`,
    full_img: `https://images.metmuseum.org/original/${nativeId}.jpg`,
    ...overrides,
  };
  const cols = Object.keys(row);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
  return sql.query(
    `INSERT INTO items (${cols.join(", ")}) VALUES (${placeholders})`,
    cols.map((c) => (row as any)[c]),
  );
}

let sql: any;
beforeAll(async () => {
  sql = await makeSql(["001_items_schema.sql", "003_items_harmonization.sql"]);
  await insertItem(sql, "1");
  await insertItem(sql, "2", { full_img: null });
  await insertItem(sql, "3", { review_status: "quarantined" });
});
afterAll(async () => {
  if (sql) await sql.$close();
});

describe("lookupOriginUrl", () => {
  it("uses the row's img for the display tier", async () => {
    expect(await proxy.lookupOriginUrl(sql, "met", "1", "display")).toBe(
      "https://images.metmuseum.org/web-large/1.jpg",
    );
  });

  it("uses full_img for the lightbox tier", async () => {
    expect(await proxy.lookupOriginUrl(sql, "met", "1", "lightbox")).toBe(
      "https://images.metmuseum.org/original/1.jpg",
    );
  });

  it("falls back to img for lightbox when there's no full_img, as api/items.ts does", async () => {
    expect(await proxy.lookupOriginUrl(sql, "met", "2", "lightbox")).toBe(
      "https://images.metmuseum.org/web-large/2.jpg",
    );
  });

  it("returns null for an item that doesn't exist", async () => {
    expect(
      await proxy.lookupOriginUrl(sql, "met", "nope", "display"),
    ).toBeNull();
  });

  it("returns null for an item that isn't live", async () => {
    expect(await proxy.lookupOriginUrl(sql, "met", "3", "display")).toBeNull();
  });

  it("returns null with no database", async () => {
    expect(await proxy.lookupOriginUrl(null, "met", "1", "display")).toBeNull();
  });
});

describe("the handler", () => {
  it("never reads the request's own ?origin=", () => {
    // Structural, like tests/img-proxy.test.ts's source checks: the whole
    // point is that no code path can reach the visitor-supplied value.
    const src = readFileSync(
      join(
        import.meta.dirname,
        "..",
        "api",
        "img",
        "[source]",
        "[id]",
        "[tier].ts",
      ),
      "utf8",
    );
    expect(src).not.toMatch(/req\.query\.origin/);
  });
});
