// Full item rows carry only what the UI renders.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";

const ROW = {
  id: "met:1",
  source: "met",
  native_id: "1",
  title: "Harbour",
  img: "https://images.example/1.jpg",
  caption_tea: "A caption",
  vibe_tags: ["calm"],
  palette_hex: ["#112233"],
  palette_buckets: ["Blue"],
  tea_voice_eligible: true,
  twist_confidence: "high",
  music_mood: "quiet",
  contributors: [{ name: "Léon Davent", role: "engraver" }],
};

vi.mock("../lib/db.ts", () => ({
  getSql: () => ({ query: vi.fn(async () => [ROW]) }),
}));
vi.mock("../lib/sentry.ts", () => ({ Sentry: {}, reportError: vi.fn() }));

const { default: handler } = await import("../api/items.ts");

async function lookup() {
  const res = {
    statusCode: 200,
    body: null as unknown,
    setHeader(_k: string, _v: string) {},
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
  };
  await handler(
    { method: "GET", query: { ids: "1" } } as unknown as VercelRequest,
    res as unknown as VercelResponse,
  );
  return (res.body as { items: Record<string, unknown>[] }).items[0];
}

describe("full item rows", () => {
  it.each([
    "vibe_tags",
    "palette_hex",
    "palette_buckets",
    "tea_voice_eligible",
    "twist_confidence",
    "music_mood",
    "contributors",
  ])("never include %s, which the UI does not read", async (field) => {
    expect(await lookup()).not.toHaveProperty(field);
  });

  it("still include what the detail panel renders", async () => {
    const item = await lookup();
    expect(item.title).toBe("Harbour");
    expect(item.caption_tea).toBe("A caption");
  });
});
