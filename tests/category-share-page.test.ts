// The /category/{slug} landing page, invoked as a real handler.
import { describe, expect, it, vi } from "vitest";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const appHtml = `<!doctype html>
<html lang="en">
<head>
  <title>Tranquilo</title>
  <meta name="description" content="A calm digital museum">
</head>
<body><div id="app"></div></body>
</html>`;
  const readFileSync = vi.fn(
    (...args: Parameters<typeof actual.readFileSync>) => {
      const [file] = args;
      if (
        String(file).split(/[\\/]/).slice(-2).join("/") === "dist/index.html"
      ) {
        return appHtml;
      }
      return actual.readFileSync(...args);
    },
  );
  return {
    ...actual,
    readFileSync,
    default: { ...actual, readFileSync },
  };
});

vi.mock("../lib/db.ts", () => ({ getSql: () => null }));
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

const { CATEGORY_PAGES } = await import("../lib/category-pages.ts");
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

describe("/category/{slug} landing page", () => {
  it("serves the app with category title, description and canonical URL", async () => {
    const res = await call(pageHandler, "category-paintings-and-portraits");
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain(
      "<title>Paintings &amp; Portraits · Tranquilo</title>",
    );
    expect(res.body).toContain(
      'rel="canonical" href="https://tranquilo.art/category/paintings-and-portraits"',
    );
    expect(res.body).toContain('<div id="app">');
  });

  it("serves every listed category", async () => {
    for (const page of CATEGORY_PAGES) {
      const res = await call(pageHandler, `category-${page.slug}`);
      expect(res.statusCode).toBe(200);
    }
  });

  it("404s Photography and unknown categories", async () => {
    for (const slug of [
      "category-photography",
      "category-nonsense",
      "category-",
    ]) {
      const res = await call(pageHandler, slug);
      expect(res.statusCode).toBe(404);
    }
  });

  it("does not claim the slug namespace of an artwork source", async () => {
    const res = await call(pageHandler, "categorical-123");
    expect(String(res.body)).not.toContain("/category/");
  });

  it("points og:image at the category card", async () => {
    const res = await call(pageHandler, "category-works-on-paper");
    expect(res.body).toContain(
      '<meta property="og:image" content="https://tranquilo.art/og/category-works-on-paper.png">',
    );
  });
});

describe("/og/category-{slug} card", () => {
  it("renders a PNG for a real category", async () => {
    const res = await call(cardHandler, "category-arms-and-armor");
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
  }, 30000);

  it("draws the category, not the not-found fallback", async () => {
    const real = await call(cardHandler, "category-arms-and-armor");
    const unknown = await call(cardHandler, "category-nonsense");
    expect(unknown.statusCode).toBe(200);
    expect(
      Buffer.compare(real.body as Uint8Array, unknown.body as Uint8Array),
    ).not.toBe(0);
  }, 30000);
});
