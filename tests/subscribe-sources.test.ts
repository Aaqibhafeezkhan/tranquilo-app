// Every signup form tags its contact with a `source`, and /api/subscribe
// rejects any source it doesn't know. The client values are read from the
// source files themselves, so a form can't start sending a tag the endpoint
// would turn away -- the e2e tests stub this endpoint and can't catch that.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../api/subscribe.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLIENT_FILES = [
  "src/components/TranquiloNewsletterModal.ts",
  "src/pages/about.ts",
  "src/pages/curator.ts",
  "src/pages/submit.ts",
];

function clientSources(): string[] {
  const found = new Set<string>();
  for (const file of CLIENT_FILES) {
    const src = readFileSync(path.join(ROOT, file), "utf8");
    for (const m of src.matchAll(/(?:source:|_SOURCE =)\s*"([a-z_]+)"/g))
      found.add(m[1]);
  }
  return [...found];
}

beforeEach(() => {
  process.env.RESEND_API_KEY = "test-key";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: any) =>
      (init?.method || "GET") === "GET"
        ? { ok: false, status: 404, json: async () => ({}) }
        : { ok: true, status: 200, text: async () => "" },
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
});

describe("subscribe sources", () => {
  it("finds every form's source tag", () => {
    expect(clientSources().length).toBe(CLIENT_FILES.length);
  });

  for (const source of clientSources()) {
    it(`accepts "${source}"`, async () => {
      const res: any = {
        statusCode: 0,
        setHeader() {},
        json(b: any) {
          this.body = b;
        },
      };
      await handler(
        { method: "POST", body: { email: "a@example.com", source } } as any,
        res,
      );
      expect(res.statusCode, JSON.stringify(res.body)).toBe(200);
    });
  }
});
