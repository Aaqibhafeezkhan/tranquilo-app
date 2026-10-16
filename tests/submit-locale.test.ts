// Every form handled by /api/submit-collection carries the language it was
// sent in, so a reply can be written in that language. An unknown or absent
// locale still sends -- it just reads "(not given)".
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../api/submit-collection.ts";

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

let sent: any;

beforeEach(() => {
  sent = null;
  process.env.RESEND_API_KEY = "test-key";
  process.env.SUBMIT_NOTIFY_EMAIL = "ops@example.com";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: any, init: any) => {
      sent = JSON.parse(init.body);
      return { ok: true, status: 200, text: async () => "" };
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
  delete process.env.SUBMIT_NOTIFY_EMAIL;
});

async function post(body: any) {
  const res = mockRes();
  await handler({ method: "POST", body } as any, res);
  return res;
}

const FORMS: Record<string, any> = {
  collection: {
    collectionName: "Example",
    submitterName: "Ada",
    submitterEmail: "ada@example.com",
    collectionLink: "https://example.org/c",
    licenseType: "CC0",
    licenseVerificationLink: "https://example.org/l",
    description: "Openly licensed.",
  },
  feedback: { kind: "feedback", message: "Lovely." },
  report: {
    kind: "report",
    itemSource: "met",
    itemNativeId: "1",
    comment: "Blurry",
  },
};

describe("form emails name the sender's language", () => {
  for (const [form, body] of Object.entries(FORMS)) {
    it(`${form}: a registered locale appears in the email`, async () => {
      const res = await post({ ...body, locale: "pt-BR" });
      expect(res.statusCode).toBe(200);
      expect(sent.text).toMatch(/Language: pt-BR/);
      expect(sent.html).toContain("pt-BR");
    });

    it(`${form}: an absent or unknown locale still sends`, async () => {
      for (const locale of [undefined, "<b>xx</b>"]) {
        const res = await post({ ...body, locale });
        expect(res.statusCode).toBe(200);
        expect(sent.text).toMatch(/Language: \(not given\)/);
        expect(sent.html).not.toContain("<b>xx</b>");
      }
    });
  }
});
