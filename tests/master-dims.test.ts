import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import * as dims from "../lib/master-dims.ts";
import { makeSql } from "./helpers/pg.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION = "049_items_master_dims.sql";

function jpeg(width: number, height: number, sofMarker = 0xc0, appBytes = 0) {
  const app = new Uint8Array(4 + appBytes);
  app.set([0xff, 0xe1, ((appBytes + 2) >> 8) & 0xff, (appBytes + 2) & 0xff]);
  const sof = new Uint8Array([
    0xff,
    sofMarker,
    0x00,
    0x11,
    0x08,
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    0x03,
  ]);
  return new Uint8Array([0xff, 0xd8, ...app, ...sof, 0, 0, 0, 0, 0, 0, 0, 0]);
}

describe("reading a JPEG header", () => {
  it("reads baseline and progressive frames past an EXIF segment", () => {
    expect(dims.jpegDimensions(jpeg(4000, 3001, 0xc0, 300))).toEqual({
      width: 4000,
      height: 3001,
    });
    expect(dims.jpegDimensions(jpeg(2212, 3400, 0xc2))).toEqual({
      width: 2212,
      height: 3400,
    });
  });

  it("returns null for a challenge page or a header cut short", () => {
    const html = new TextEncoder().encode(
      "<!doctype html><title>Just a moment",
    );
    expect(dims.jpegDimensions(html)).toBeNull();
    expect(
      dims.jpegDimensions(jpeg(4000, 3000, 0xc0, 300).slice(0, 200)),
    ).toBeNull();
  });
});

describe("print tiers", () => {
  it("tiers by the short edge", () => {
    expect(dims.printTier(4000, 3000)).toBe("A");
    expect(dims.printTier(2999, 4000)).toBe("B");
    expect(dims.printTier(1800, 1800)).toBe("B");
    expect(dims.printTier(1799, 4000)).toBe("C");
  });
});

describe("which sources may be measured", () => {
  it("refuses commons and anything not explicitly approved", () => {
    expect(() => dims.assertSourceMeasurable("commons")).toThrow();
    expect(() => dims.assertSourceMeasurable("europeana")).toThrow();
    expect(() => dims.assertSourceMeasurable("met")).not.toThrow();
    expect(() => dims.assertSourceMeasurable("cleveland")).not.toThrow();
  });
});

describe("a measuring run", () => {
  let sql: any;

  async function insertItem(id: string, extra: Record<string, any> = {}) {
    const [source, nativeId] = id.split(":");
    const row = {
      id,
      source,
      native_id: nativeId,
      title: `Test ${nativeId}`,
      category: "Painting",
      full_img: `https://images.example.org/${nativeId}.jpg`,
      ...extra,
    };
    const cols = Object.keys(row);
    await sql.query(
      `INSERT INTO items (${cols.join(", ")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")})`,
      cols.map((c) => (row as any)[c]),
    );
  }

  function fakeFetch(
    responses: Record<string, { status: number; body?: Uint8Array }>,
  ) {
    const calls: { url: string; range: string | null }[] = [];
    const impl = async (url: string, init: any) => {
      calls.push({ url, range: init?.headers?.Range ?? null });
      const nativeId = url.split("/").pop()!.replace(".jpg", "");
      const r = responses[nativeId] ?? { status: 206, body: jpeg(3000, 4000) };
      return new Response(r.body ? new Blob([r.body as BlobPart]) : null, {
        status: r.status,
      });
    };
    return { impl, calls };
  }

  const run = (fetchImpl: any, extra: Record<string, any> = {}) =>
    dims.measureBatch({
      sql,
      source: "met",
      commit: true,
      fetchImpl,
      sleepMs: async () => {},
      ...extra,
    });

  beforeEach(async () => {
    sql = await makeSql([
      "001_items_schema.sql",
      "003_items_harmonization.sql",
      MIGRATION,
    ]);
  });

  it("records master dimensions from a ranged header read", async () => {
    await insertItem("met:1");
    const { impl, calls } = fakeFetch({
      "1": { status: 206, body: jpeg(4000, 2667) },
    });
    const result = await run(impl);
    expect(result.measured).toBe(1);
    expect(calls[0].range).toMatch(/^bytes=0-\d+$/);
    const [row] = await sql.query(
      "SELECT master_width, master_height, master_dims_checked_at FROM items",
    );
    expect(row.master_width).toBe(4000);
    expect(row.master_height).toBe(2667);
    expect(row.master_dims_checked_at).not.toBeNull();
  });

  it("skips withheld items, other sources and items already checked", async () => {
    await insertItem("met:1", { review_status: "quarantined" });
    await insertItem("met:2", { category: "Photography" });
    await insertItem("cleveland:3");
    await insertItem("met:4", {
      master_dims_checked_at: new Date().toISOString(),
    });
    await insertItem("met:5");
    const { impl, calls } = fakeFetch({});
    await run(impl);
    expect(calls.map((c) => c.url)).toEqual([
      "https://images.example.org/5.jpg",
    ]);
  });

  it("stops the whole run at the first throttle or block", async () => {
    for (const n of ["1", "2", "3"]) await insertItem(`met:${n}`);
    const { impl, calls } = fakeFetch({ "1": { status: 429 } });
    const result = await run(impl);
    expect(result.stoppedBy).toMatch(/429/);
    expect(calls).toHaveLength(1);
    const unchecked = await sql.query(
      "SELECT id FROM items WHERE master_dims_checked_at IS NULL",
    );
    expect(unchecked).toHaveLength(3);
  });

  it("marks an unreadable image checked so it is not retried daily", async () => {
    await insertItem("met:1");
    const { impl } = fakeFetch({ "1": { status: 404 } });
    await run(impl);
    const [row] = await sql.query(
      "SELECT master_width, master_dims_checked_at FROM items",
    );
    expect(row.master_width).toBeNull();
    expect(row.master_dims_checked_at).not.toBeNull();
  });

  it("never exceeds the daily allowance, counting earlier runs today", async () => {
    for (let n = 1; n <= 5; n++) await insertItem(`met:${n}`);
    const { impl, calls } = fakeFetch({});
    await run(impl, { dailyLimit: 3 });
    await run(impl, { dailyLimit: 3 });
    expect(calls).toHaveLength(3);
  });

  it("waits at least the minimum interval between requests", async () => {
    for (const n of ["1", "2"]) await insertItem(`met:${n}`);
    const waits: number[] = [];
    const { impl } = fakeFetch({});
    await run(impl, { sleepMs: async (ms: number) => void waits.push(ms) });
    expect(waits.length).toBeGreaterThan(0);
    expect(Math.min(...waits)).toBeGreaterThanOrEqual(dims.MIN_INTERVAL_MS);
  });

  it("fetches and writes nothing on a dry run", async () => {
    await insertItem("met:1");
    const { impl, calls } = fakeFetch({});
    const result = await run(impl, { commit: false });
    expect(calls).toHaveLength(0);
    expect(result.planned).toBe(1);
  });
});

describe("the migration", () => {
  it("is mirrored in a prisma migration", () => {
    const statements = (s: string) =>
      s
        .split("\n")
        .filter((l) => !l.trim().startsWith("--"))
        .join("\n")
        .trim();
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
        "20261025120000_items_master_dims",
        "migration.sql",
      ),
      "utf8",
    );
    expect(statements(prismaFile)).toBe(statements(sqlFile));
  });
});
