// The /discover share page and its preview card, invoked as the real handler.
import { describe, expect, it, vi } from "vitest";

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
