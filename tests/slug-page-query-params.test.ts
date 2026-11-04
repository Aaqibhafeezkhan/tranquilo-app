// Vercel parses a repeated query param into an array; the share page takes
// the first value, same as api/items.ts.
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

describe("/v/{slug} with a repeated slug param", () => {
  it("answers with the not-found page instead of throwing", async () => {
    const res = fakeRes();
    const req = {
      query: { slug: ["met-1", "met-2"] },
      headers: { host: "tranquilo.art" },
    };
    await handler(req as never, res as never);
    expect(res.statusCode).toBe(404);
    expect(res.body).toContain("/v/met-1");
  });
});
