// The /discover share page and its preview card, invoked as the real handler.
import { describe, expect, it, vi } from "vitest";

// The handler serves the built app page; stubbed so the test does not depend
// on a prior `vite build`.
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const appHtml = `<!doctype html>
<html lang="en">
<head>
  <title>Tranquilo</title>
  <meta name="description" content="A calm digital museum">
  <link rel="canonical" href="https://tranquilo.art/">
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

vi.stubEnv("DATABASE_URL", "");
const { default: handler } = await import("../api/v/[slug].ts");

function fakeRes() {
  const headers: Record<string, string> = {};
  return {
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
}

async function discoverPage() {
  const res = fakeRes();
  await handler(
    {
      query: { slug: "discover" },
      headers: { host: "tranquilo.art" },
    } as never,
    res as never,
  );
  return res;
}

describe("/discover share page", () => {
  it("serves a 200 with its own title and description", async () => {
    const res = await discoverPage();
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("<title>Discover · Tranquilo</title>");
    expect(res.body).toContain(
      '<meta property="og:description" content="Discover curious collections &amp; stories behind the art">',
    );
  });

  it("canonicalises to /discover", async () => {
    const res = await discoverPage();
    expect(res.body).toContain(
      'rel="canonical" href="https://tranquilo.art/discover"',
    );
    expect(res.body).toContain(
      '<meta property="og:url" content="https://tranquilo.art/discover">',
    );
  });

  it("carries one canonical link, not the homepage's as well", async () => {
    const res = await discoverPage();
    expect(res.body.match(/rel="canonical"/g)).toHaveLength(1);
    expect(res.body).not.toContain('href="https://tranquilo.art/"');
  });

  it("points og:image at its own card", async () => {
    const res = await discoverPage();
    expect(res.body).toContain(
      '<meta property="og:image" content="https://tranquilo.art/og/discover.png">',
    );
    expect(res.body).toContain(
      '<meta name="twitter:card" content="summary_large_image">',
    );
  });

  it("is edge-cacheable, since it needs no database", async () => {
    const res = await discoverPage();
    expect(res.headers["cache-control"]).toContain("s-maxage");
  });
});
