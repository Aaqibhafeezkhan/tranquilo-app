// /api/subscribe records the language someone signed up in as a `locale`
// contact property, so a later newsletter can go out in that language without
// asking everyone again. Resend's create-contact replaces `properties`
// wholesale, so a signup that doesn't send a locale must keep the stored one.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../api/subscribe.ts";

function mockRes(): any {
  return {
    statusCode: 0,
    body: null,
    headers: {} as any,
    setHeader(k: string, v: any) {
      this.headers[k] = v;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
}

// The contact Resend already holds (null = first-time signup, a 404), and
// every request the handler made.
let existing: any;
let calls: { url: string; method: string; body: any }[];
let missingProperties: Set<string>;

function lastCreate() {
  return calls
    .filter((c) => c.method === "POST" && c.url.endsWith("/contacts"))
    .at(-1)!.body;
}

beforeEach(() => {
  existing = null;
  calls = [];
  missingProperties = new Set();
  process.env.RESEND_API_KEY = "test-key";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: any) => {
      const method = init?.method || "GET";
      const body = init?.body ? JSON.parse(init.body) : null;
      calls.push({ url, method, body });
      if (method === "GET") {
        return existing
          ? { ok: true, status: 200, json: async () => existing }
          : { ok: false, status: 404, json: async () => ({}) };
      }
      if (url.endsWith("/contact-properties")) {
        missingProperties.delete(body.key);
        return { ok: true, status: 200, text: async () => "" };
      }
      const unknown = Object.keys(body.properties || {}).some((k) =>
        missingProperties.has(k),
      );
      return unknown
        ? {
            ok: false,
            status: 422,
            text: async () => "One or more properties do not exist",
          }
        : { ok: true, status: 200, text: async () => "" };
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
});

async function post(body: any) {
  const res = mockRes();
  await handler({ method: "POST", body } as any, res);
  return res;
}

describe("subscribe records the signup's language", () => {
  it("stores a registered locale on the contact", async () => {
    const res = await post({
      email: "a@example.com",
      source: "newsletter_submit",
      locale: "pt-BR",
    });
    expect(res.statusCode).toBe(200);
    expect(lastCreate().properties).toEqual({
      source: "newsletter_submit",
      locale: "pt-BR",
    });
  });

  it("drops an unregistered locale without failing the signup", async () => {
    const res = await post({
      email: "a@example.com",
      source: "newsletter_submit",
      locale: "xx",
    });
    expect(res.statusCode).toBe(200);
    expect(lastCreate().properties).toEqual({ source: "newsletter_submit" });
  });

  it("keeps the stored locale when a signup sends none", async () => {
    existing = {
      properties: { source: "pro_waitlist", locale: { value: "pt-BR" } },
    };
    await post({ email: "a@example.com", source: "newsletter_submit" });
    expect(lastCreate().properties).toEqual({
      source: "pro_waitlist,newsletter_submit",
      locale: "pt-BR",
    });
  });

  it("lets a newer signup's locale replace the stored one", async () => {
    existing = { properties: { source: "pro_waitlist", locale: "pt-BR" } };
    await post({
      email: "a@example.com",
      source: "pro_waitlist",
      locale: "en",
    });
    expect(lastCreate().properties.locale).toBe("en");
  });

  it("creates the locale property on first use, then retries", async () => {
    missingProperties = new Set(["locale"]);
    const res = await post({
      email: "a@example.com",
      source: "newsletter_submit",
      locale: "pt-BR",
    });
    expect(res.statusCode).toBe(200);
    const created = calls
      .filter((c) => c.url.endsWith("/contact-properties"))
      .map((c) => c.body.key);
    expect(created).toContain("locale");
    expect(lastCreate().properties.locale).toBe("pt-BR");
  });
});
