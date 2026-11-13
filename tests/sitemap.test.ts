// /sitemap.xml lists site pages, categories, shelves and storylines -- never
// individual artworks -- invoked as the real handler against PGlite.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { makeSql } from "./helpers/pg.ts";

const db: { sql: Awaited<ReturnType<typeof makeSql>> | null } = { sql: null };

vi.mock("../lib/db.ts", () => ({ getSql: () => db.sql }));
vi.mock("../lib/sentry.ts", () => ({ Sentry: {}, reportError: vi.fn() }));

const { default: handler } = await import("../api/sitemap.ts");

async function get(method = "GET") {
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 200,
    body: "",
    headers,
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
    },
    end(body: string) {
      this.body = body;
    },
  };
  await handler(
    { method, headers: { host: "tranquilo.art" }, socket: {} } as never,
    res as never,
  );
  return res;
}

const locs = (xml: string) =>
  [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

beforeAll(async () => {
  db.sql = await makeSql([
    "001_items_schema.sql",
    "003_items_harmonization.sql",
    "005_items_search.sql",
    "006_items_region_alt.sql",
    "017_items_shuffle_key.sql",
    "031_items_delisted_state.sql",
    "038_items_palette_buckets.sql",
    "019_storylines.sql",
    "021_shelves.sql",
    "022_shelves_seed.sql",
  ]);
  for (const id of ["140408", "451725"]) {
    await db.sql.query(
      "INSERT INTO items (id, source, native_id, title, category) VALUES ($1, 'cleveland', $2, $3, 'Painting')",
      [`cleveland:${id}`, id, `Bird ${id}`],
    );
  }
  await db.sql.query(
    `INSERT INTO storylines (id, title, type, tier, cover_item_id, intro_caption, items)
     VALUES ('birds-of-a-feather', 'Birds', 'theme', 'structural', '1', 'Intro', '[]'::jsonb)`,
  );
});
afterAll(async () => {
  if (db.sql) await db.sql.$close();
});

describe("/sitemap.xml", () => {
  it("starts with the XML declaration, no leading whitespace", async () => {
    const res = await get();
    expect(res.statusCode).toBe(200);
    expect(res.body.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(
      true,
    );
    expect(res.headers["content-type"]).toContain("application/xml");
  });

  it("lists the home page, static pages and discover", async () => {
    const urls = locs((await get()).body);
    expect(urls).toContain("https://tranquilo.art/");
    expect(urls).toContain("https://tranquilo.art/pages/about.html");
    expect(urls).toContain("https://tranquilo.art/discover");
  });

  it("lists a landing page per category, never Photography", async () => {
    const urls = locs((await get()).body);
    expect(urls).toContain("https://tranquilo.art/category/works-on-paper");
    expect(urls).toContain(
      "https://tranquilo.art/category/paintings-and-portraits",
    );
    expect(urls.some((u) => u.includes("photography"))).toBe(false);
  });

  it("lists shareable shelves by slug and skips the storylines shelf", async () => {
    const urls = locs((await get()).body);
    expect(urls).toContain("https://tranquilo.art/shelf/birdwatching");
    expect(urls).not.toContain("https://tranquilo.art/shelf/storylines");
  });

  it("skips shelves with no live works", async () => {
    const urls = locs((await get()).body);
    expect(urls).not.toContain(
      "https://tranquilo.art/shelf/main-character-energy",
    );
  });

  it("lists storylines", async () => {
    expect(locs((await get()).body)).toContain(
      "https://tranquilo.art/s/birds-of-a-feather",
    );
  });

  it("never lists an individual artwork", async () => {
    const urls = locs((await get()).body);
    expect(urls.some((u) => u.includes("/v/"))).toBe(false);
  });

  it("has no duplicate URLs and stays far below the 50,000 limit", async () => {
    const urls = locs((await get()).body);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.length).toBeLessThan(5000);
  });

  it("rejects non-GET methods", async () => {
    expect((await get("POST")).statusCode).toBe(405);
  });
});
