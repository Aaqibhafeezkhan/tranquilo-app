// A repeated query param arrives as an array; the card uses the first value.
// Without web fonts, @vercel/og must fall back to its bundled font.
import { describe, expect, it, vi } from "vitest";

vi.stubEnv("DATABASE_URL", "");
vi.stubGlobal(
  "fetch",
  vi.fn(async () => {
    throw new Error("network disabled in tests");
  }),
);
const { default: handler } = await import("../api/og/[slug].ts");

function fakeRes() {
  const headers: Record<string, string> = {};
  return {
    statusCode: 200,
    headersSent: false,
    body: null as unknown,
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

async function render(slug: string | string[]) {
  const res = fakeRes();
  const req = {
    query: { slug },
    headers: { host: "tranquilo.art", "x-forwarded-for": "203.0.113.9" },
    socket: {},
  };
  await handler(req as never, res as never);
  return res;
}

describe("/og/{slug}", () => {
  it("renders a card when the web fonts can't be fetched", async () => {
    const res = await render("met-1");
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
  }, 30000);

  it("renders a card with a repeated slug param", async () => {
    const res = await render(["met-1", "met-2"]);
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
  }, 30000);
});
