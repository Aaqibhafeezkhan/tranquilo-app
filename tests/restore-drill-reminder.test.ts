// The quarterly restore-drill reminder: a backup nobody has restored is a
// hypothesis, so the runbook commits to a restore drill every quarter and
// this cron emails the maintainer when one is due. Exercised through the
// real handler with fetch stubbed -- no network, no Resend account.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../lib/cron/restore-drill-reminder.ts";

function fakeRes() {
  const res: any = { statusCode: 200, body: undefined };
  res.json = (b: any) => {
    res.body = b;
    return res;
  };
  return res;
}

function req(auth?: string) {
  return { headers: auth ? { authorization: auth } : {}, query: {} };
}

const ENV = {
  CRON_SECRET: "test-secret",
  RESEND_API_KEY: "re_test",
  SUBMIT_NOTIFY_EMAIL: "ops@example.org",
};

describe("restore-drill-reminder cron", () => {
  let fetchSpy: any;

  beforeEach(() => {
    for (const [k, v] of Object.entries(ENV)) vi.stubEnv(k, v);
    fetchSpy = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("rejects a request without the cron secret and sends nothing", async () => {
    const res = fakeRes();
    await handler(req("Bearer wrong"), res);
    expect(res.statusCode).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("emails the maintainer through Resend when called by the scheduler", async () => {
    const res = fakeRes();
    await handler(req("Bearer test-secret"), res);

    expect(res.statusCode).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(init.body);
    expect(body.to).toEqual(["ops@example.org"]);
    expect(body.subject).toMatch(/restore drill/i);
  });

  it("tells the reader what to actually do, not just that it is due", async () => {
    await handler(req("Bearer test-secret"), fakeRes());
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.text).toMatch(/Neon branch/);
    expect(body.text).toMatch(/restore/i);
    expect(body.text).toMatch(/row count/i);
  });

  it("reports a failure instead of claiming success when the email can't be sent", async () => {
    fetchSpy.mockImplementation(
      async () => new Response("nope", { status: 500 }),
    );
    const res = fakeRes();
    await handler(req("Bearer test-secret"), res);
    expect(res.statusCode).toBe(500);
  });

  it("fails loudly when email isn't configured, rather than silently skipping", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const res = fakeRes();
    await handler(req("Bearer test-secret"), res);
    expect(res.statusCode).toBe(500);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
