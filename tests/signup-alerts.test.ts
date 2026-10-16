// A signup or form that fails because of us -- a form sending a tag the
// endpoint doesn't know, a missing key, Resend refusing the call -- must reach
// Sentry, not just the function log. The homepage newsletter modal was turned
// away for weeks with nothing but a console line. A visitor's own mistake (a
// mistyped email, an empty field) is not ours to be paged about.
//
// No email address or message text may ride along to Sentry.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const reportProblem = vi.fn(async () => {});
vi.mock("../lib/sentry.ts", () => ({
  reportError: vi.fn(async () => {}),
  reportProblem,
}));

const { default: subscribe } = await import("../api/subscribe.ts");
const { default: submit } = await import("../api/submit-collection.ts");

function mockRes(): any {
  return {
    statusCode: 0,
    body: null,
    setHeader() {},
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
}

// What Resend answers to a POST (GET /contacts always 404s: a new contact).
let resendPost: { ok: boolean; status: number; text: string };

beforeEach(() => {
  reportProblem.mockClear();
  resendPost = { ok: true, status: 200, text: "" };
  process.env.RESEND_API_KEY = "test-key";
  process.env.SUBMIT_NOTIFY_EMAIL = "ops@example.com";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: any) =>
      (init?.method || "GET") === "GET"
        ? { ok: false, status: 404, json: async () => ({}) }
        : { ...resendPost, text: async () => resendPost.text },
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
  delete process.env.SUBMIT_NOTIFY_EMAIL;
});

async function call(handler: any, body: any) {
  const res = mockRes();
  await handler({ method: "POST", body } as any, res);
  return res;
}

const EMAIL = "private.person@example.com";
const SIGNUP = { email: EMAIL, source: "homepage_newsletter" };
const FEEDBACK = { kind: "feedback", message: "secret words", email: EMAIL };

function reported(): string {
  return JSON.stringify(reportProblem.mock.calls);
}

describe("subscribe alerts on our failures", () => {
  it("an unknown source tag", async () => {
    const res = await call(subscribe, { ...SIGNUP, source: "brand_new_form" });
    expect(res.statusCode).toBe(400);
    expect(reportProblem).toHaveBeenCalledTimes(1);
    expect(reported()).toContain("brand_new_form");
  });

  it("Resend refusing the contact", async () => {
    resendPost = { ok: false, status: 500, text: "upstream broke" };
    const res = await call(subscribe, SIGNUP);
    expect(res.statusCode).toBe(502);
    expect(reportProblem).toHaveBeenCalledTimes(1);
    expect(reported()).toContain("500");
  });

  it("a missing API key", async () => {
    delete process.env.RESEND_API_KEY;
    const res = await call(subscribe, SIGNUP);
    expect(res.statusCode).toBe(500);
    expect(reportProblem).toHaveBeenCalledTimes(1);
  });

  it("but not a visitor's mistyped email, or a success", async () => {
    await call(subscribe, { ...SIGNUP, email: "not-an-email" });
    await call(subscribe, SIGNUP);
    expect(reportProblem).not.toHaveBeenCalled();
  });
});

describe("form emails alert on our failures", () => {
  it("Resend refusing the send", async () => {
    resendPost = { ok: false, status: 403, text: "domain not verified" };
    const res = await call(submit, FEEDBACK);
    expect(res.statusCode).toBe(502);
    expect(reportProblem).toHaveBeenCalledTimes(1);
    expect(reported()).toContain("403");
  });

  it("missing configuration", async () => {
    delete process.env.SUBMIT_NOTIFY_EMAIL;
    const res = await call(submit, FEEDBACK);
    expect(res.statusCode).toBe(500);
    expect(reportProblem).toHaveBeenCalledTimes(1);
  });

  it("but not a visitor's empty message, or a success", async () => {
    await call(submit, { kind: "feedback", message: "" });
    await call(submit, FEEDBACK);
    expect(reportProblem).not.toHaveBeenCalled();
  });
});

describe("what reaches Sentry", () => {
  it("never includes the visitor's email or message", async () => {
    resendPost = { ok: false, status: 500, text: "upstream broke" };
    await call(subscribe, SIGNUP);
    await call(submit, FEEDBACK);
    await call(subscribe, { ...SIGNUP, source: "brand_new_form" });
    expect(reportProblem).toHaveBeenCalledTimes(3);
    expect(reported()).not.toContain(EMAIL);
    expect(reported()).not.toContain("secret words");
  });
});

describe("redactEmails", async () => {
  const { redactEmails } = await import("../lib/redact.ts");
  it("strips address-shaped text and caps length", () => {
    expect(redactEmails('Invalid `to`: "a.b+c@example.co.uk" rejected')).toBe(
      'Invalid `to`: "[email]" rejected',
    );
    expect(redactEmails("x".repeat(900)).length).toBe(500);
  });
});
