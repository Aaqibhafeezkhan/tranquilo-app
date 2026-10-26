// The /shelf/{id} share page and its preview card, invoked as real
// handlers against PGlite.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { makeSql } from "./helpers/pg.ts";

const db: { sql: Awaited<ReturnType<typeof makeSql>> | null } = { sql: null };
vi.mock("../lib/db.ts", () => ({ getSql: () => db.sql }));
vi.mock("../lib/sentry.ts", () => ({ Sentry: {}, reportError: vi.fn() }));
vi.mock("../lib/img-visitor-rate-limit.ts", () => ({
  rateLimitOrRespond: async () => false,
}));
vi.stubGlobal(
  "fetch",
  vi.fn(async () => {
    throw new Error("network disabled in tests");
  }),
);

const { default: pageHandler } = await import("../api/v/[slug].ts");
const { default: cardHandler } = await import("../api/og/[slug].ts");

function fakeRes() {
  const headers: Record<string, string> = {};
  return {
    statusCode: 200,
    headersSent: false,
    body: "" as unknown,
    headers,
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
    },
    end(body: unknown) {
      this.body = body;
    },
    json(body: unknown) {
      this.body = body;
    },
  };
}

async function call(
  handler: (req: never, res: never) => Promise<unknown>,
  slug: string,
) {
  const res = fakeRes();
  await handler(
    {
      query: { slug },
      headers: { host: "tranquilo.art", "x-forwarded-for": "203.0.113.9" },
      socket: {},
    } as never,
    res as never,
  );
  return res;
}

beforeAll(async () => {
  db.sql = await makeSql([
    "001_items_schema.sql",
    "003_items_harmonization.sql",
    "005_items_search.sql",
    "006_items_region_alt.sql",
    "017_items_shuffle_key.sql",
    "031_items_delisted_state.sql",
    "038_items_palette_buckets.sql",
    "021_shelves.sql",
    "022_shelves_seed.sql",
  ]);
  for (const id of ["140408", "451725"]) {
    await db.sql.query(
      "INSERT INTO items (id, source, native_id, title, category) VALUES ($1, 'cleveland', $2, $3, 'Painting')",
      [`cleveland:${id}`, id, `Bird ${id}`],
    );
  }
});
afterAll(async () => {
  if (db.sql) await db.sql.$close();
});

describe("/shelf/{slug} share page", () => {
  it("canonicalises to the title slug, even from an id link", async () => {
    const res = await call(pageHandler, "shelf-painted-by-themselves");
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain(
      'rel="canonical" href="https://tranquilo.art/shelf/main-character-energy"',
    );
    expect(res.body).toContain(
      'content="https://tranquilo.art/og/shelf-main-character-energy.png"',
    );
  });

  it("serves the title slug directly", async () => {
    const res = await call(pageHandler, "shelf-main-character-energy");
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain(
      "<title>Main Character Energy · Tranquilo</title>",
    );
  });

  it("describes the shelf by its title and live work count", async () => {
    const res = await call(pageHandler, "shelf-birdwatching");
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("<title>Birdwatching · Tranquilo</title>");
    expect(res.body).toContain(
      '<meta property="og:title" content="Birdwatching — 2 works">',
    );
  });

  it("canonicalises to /shelf/{id} and points og:image at the shelf card", async () => {
    const res = await call(pageHandler, "shelf-birdwatching");
    expect(res.body).toContain(
      'rel="canonical" href="https://tranquilo.art/shelf/birdwatching"',
    );
    expect(res.body).toContain(
      'content="https://tranquilo.art/og/shelf-birdwatching.png"',
    );
  });

  it("never redirects back to itself", async () => {
    const res = await call(pageHandler, "shelf-no-such-shelf");
    expect(res.body).not.toContain(
      'location.replace("https://tranquilo.art/shelf/',
    );
  });

  it("404s an unknown shelf with its own message", async () => {
    const res = await call(pageHandler, "shelf-no-such-shelf");
    expect(res.statusCode).toBe(404);
    expect(res.body).toContain("That shelf couldn't be found.");
  });

  it("404s the storylines shelf, which has no shareable contents", async () => {
    const res = await call(pageHandler, "shelf-storylines");
    expect(res.statusCode).toBe(404);
  });
});

describe("/og/shelf-{id} card", () => {
  it("renders a PNG for a real shelf", async () => {
    const res = await call(cardHandler, "shelf-birdwatching");
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
  }, 30000);

  it("still renders a fallback PNG for an unknown shelf", async () => {
    const res = await call(cardHandler, "shelf-no-such-shelf");
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
  }, 30000);

  it("draws the shelf, not the not-found fallback", async () => {
    const real = await call(cardHandler, "shelf-birdwatching");
    const unknown = await call(cardHandler, "shelf-no-such-shelf");
    expect(
      Buffer.compare(real.body as Uint8Array, unknown.body as Uint8Array),
    ).not.toBe(0);
  }, 30000);
});
