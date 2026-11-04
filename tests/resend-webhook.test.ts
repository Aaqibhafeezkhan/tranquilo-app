// /api/webhooks/resend verifies the Svix signature over the raw body, then
// emails the ops inbox for delivery failures. These tests sign real payloads
// with the same library, so a verify/parse contract change in svix fails here.
import { Readable } from "node:stream";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Webhook } from "svix";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../api/webhooks/resend.ts";

const SECRET = `whsec_${Buffer.from("test-webhook-secret-32-bytes!!!!").toString("base64")}`;

function mockRes() {
  const res = {
    statusCode: 0,
    body: null as unknown,
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

function signedRequest(payload: unknown, secret = SECRET): VercelRequest {
  const body = JSON.stringify(payload);
  const id = "msg_test";
  const timestamp = new Date();
  const signature = new Webhook(secret).sign(id, timestamp, body);
  return Object.assign(Readable.from([Buffer.from(body)]), {
    method: "POST",
    headers: {
      "svix-id": id,
      "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
      "svix-signature": signature,
    },
  }) as unknown as VercelRequest;
}

function call(req: VercelRequest, res: ReturnType<typeof mockRes>) {
  return handler(req, res as unknown as VercelResponse);
}

let sent: { text: string }[];

beforeEach(() => {
  sent = [];
  process.env.RESEND_WEBHOOK_SECRET = SECRET;
  process.env.RESEND_API_KEY = "test-key";
  process.env.OPS_ALERT_EMAIL = "ops@example.com";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      sent.push(JSON.parse(String(init.body)));
      return { ok: true, status: 200 };
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.RESEND_WEBHOOK_SECRET;
  delete process.env.RESEND_API_KEY;
  delete process.env.OPS_ALERT_EMAIL;
});

describe("api/webhooks/resend", () => {
  it("emails the ops inbox for a correctly signed bounce", async () => {
    const res = mockRes();
    await call(
      signedRequest({
        type: "email.bounced",
        data: {
          to: ["someone@example.com"],
          subject: "Welcome",
          bounce: {
            type: "Permanent",
            subType: "General",
            message: "No such user",
          },
        },
      }),
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, handled: true });
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toContain("email.bounced for someone@example.com");
    expect(sent[0].text).toContain("No such user");
  });

  it("acknowledges a correctly signed event it doesn't alert on", async () => {
    const res = mockRes();
    await call(signedRequest({ type: "email.delivered", data: {} }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, handled: false });
    expect(sent).toHaveLength(0);
  });

  it("rejects a payload signed with a different secret", async () => {
    const other = `whsec_${Buffer.from("another-secret-of-32-bytes-long!").toString("base64")}`;
    const res = mockRes();
    await call(signedRequest({ type: "email.bounced", data: {} }, other), res);

    expect(res.statusCode).toBe(401);
    expect(sent).toHaveLength(0);
  });
});
