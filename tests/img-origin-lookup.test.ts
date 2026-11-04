// The image proxy fetches whatever URL lookupOriginUrl() returns and
// caches it under the item's key. It once trusted the request's own
// `?origin=` instead, so two requests with a URL of the caller's choosing
// swapped the picture every later visitor saw for that item. These pin the
// lookup to the item's row, against real Postgres (PGlite).

import sharp from "sharp";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { makeSql } from "./helpers/pg.ts";

// The handler's collaborators that aren't under test here. The item lookup
// is NOT among them: getSql() hands back the real PGlite connection.
const db = vi.hoisted(() => ({ sql: null as any }));
const stored = vi.hoisted(() => ({
  url: "https://blob.test/img-cache/stored",
}));

vi.mock("../lib/db.ts", () => ({ getSql: () => db.sql }));
vi.mock("../lib/sentry.ts", () => ({
  Sentry: { startSpan: (_opts: any, fn: any) => fn() },
  reportError: vi.fn(),
}));
vi.mock("@vercel/blob", () => ({
  // Always a Blob cache miss.
  head: vi.fn(async () => {
    throw new Error("not found");
  }),
  put: vi.fn(async () => ({ url: stored.url })),
}));
vi.mock("../lib/img-visitor-rate-limit.ts", () => ({
  rateLimitOrRespond: async () => false,
}));
vi.mock("../lib/img-admission.ts", async (importOriginal) => ({
  ...(await importOriginal<any>()),
  noteRequest: async () => ({ admit: true, requests: 1, threshold: 1 }),
  markStored: async () => {},
  touch: async () => {},
}));
vi.mock("../lib/img-fetch-guard.ts", async (importOriginal) => ({
  ...(await importOriginal<any>()),
  bumpStat: async () => {},
  bumpShedReason: async () => {},
  acquireFetchToken: async () => ({ allowed: true }),
  acquireHostToken: async () => ({ allowed: true }),
  claimFetch: async () => true,
  releaseFetch: async () => {},
  recordOriginOutcome: async () => {},
  recordHostOutcome: async () => {},
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
  sql = await makeSql([
    "001_items_schema.sql",
    "003_items_harmonization.sql",
    "009_blob_usage_tracker_schema.sql",
  ]);
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

// The handler end to end, on a cache miss. Only what the handler is NOT
// being tested for is stubbed (visitor rate limit, fetch guard, admission,
// Blob, the network): the item lookup runs against the real PGlite rows
// above, and the origin fetch goes through the handler's own fetchOrigin()
// to a stubbed global fetch that records every URL it is asked for.
describe("the handler on a cache miss", () => {
  const ROW_IMG = "https://upload.wikimedia.org/wikipedia/commons/a/a1/Row.jpg";
  const ROW_FULL =
    "https://upload.wikimedia.org/wikipedia/commons/f/f1/Row-full.jpg";
  // An allowlisted Commons host, so the allowlist cannot be what saves us:
  // only the choice of URL does.
  const HOSTILE =
    "https://upload.wikimedia.org/wikipedia/commons/9/99/Attacker-chosen.jpg";

  let jpeg: Buffer;
  let fetched: string[];

  beforeAll(async () => {
    await insertItem(sql, "c1", {
      id: "commons:c1",
      source: "commons",
      img: ROW_IMG,
      full_img: ROW_FULL,
    });
    await insertItem(sql, "c-gone", {
      id: "commons:c-gone",
      source: "commons",
      review_status: "quarantined",
    });
    jpeg = await sharp({
      create: {
        width: 8,
        height: 8,
        channels: 3,
        background: { r: 120, g: 120, b: 120 },
      },
    })
      .jpeg()
      .toBuffer();
    db.sql = sql;
  });

  beforeEach(() => {
    fetched = [];
    process.env.BLOB_READ_WRITE_TOKEN = "test-token";
    for (const k of [
      "S3_BUCKET",
      "S3_REGION",
      "S3_ACCESS_KEY_ID",
      "S3_SECRET_ACCESS_KEY",
      "IMG_CDN_BASE_URL",
    ]) {
      delete process.env[k];
    }
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: any) => {
        fetched.push(String(url));
        return new Response(new Uint8Array(jpeg), {
          status: 200,
          headers: { "content-type": "image/jpeg" },
        });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  function call(
    id: string | string[],
    tier: string,
    origin?: string | string[],
  ) {
    const req: any = {
      query: { source: "commons", id, tier, ...(origin ? { origin } : {}) },
      headers: {},
    };
    const res: any = {
      statusCode: 200,
      headers: {} as Record<string, string>,
      body: undefined as any,
      setHeader(k: string, v: string) {
        this.headers[k.toLowerCase()] = String(v);
      },
      json(b: any) {
        this.body = b;
      },
      end() {},
    };
    return proxy.default(req, res).then(() => res);
  }

  it.each([
    ["display", ROW_IMG],
    ["lightbox", ROW_FULL],
  ])(
    "fetches the row's URL for the %s tier, not the request's ?origin=",
    async (tier, rowUrl) => {
      const res = await call("c1", tier, HOSTILE);

      expect(fetched).toEqual([rowUrl]);
      expect(fetched).not.toContain(HOSTILE);
      // It still went all the way through: fetched, transformed, stored.
      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe(stored.url);
    },
  );

  it("ignores a repeated ?origin= too (an array in Vercel's req.query)", async () => {
    await call("c1", "display", [HOSTILE, "https://example.com/x.jpg"]);

    expect(fetched).toEqual([ROW_IMG]);
  });

  it("takes the first value of a repeated ?id=", async () => {
    const res = await call(["c1", "c-gone"], "display");

    expect(fetched).toEqual([ROW_IMG]);
    expect(res.statusCode).toBe(302);
  });

  it("answers 404 for an item that isn't live, and fetches nothing, even with ?origin=", async () => {
    const res = await call("c-gone", "display", HOSTILE);

    expect(res.statusCode).toBe(404);
    expect(fetched).toEqual([]);
  });

  it("answers 404 for an item that doesn't exist, and fetches nothing, even with ?origin=", async () => {
    const res = await call("no-such-item", "lightbox", HOSTILE);

    expect(res.statusCode).toBe(404);
    expect(fetched).toEqual([]);
  });
});
