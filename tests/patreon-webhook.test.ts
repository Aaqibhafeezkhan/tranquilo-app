// /api/webhooks/patreon verifies Patreon's HMAC-MD5 signature over the raw
// body, then mirrors the member into the patrons table.
import { createHmac } from "node:crypto";
import { Readable } from "node:stream";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import handler from "../api/webhooks/patreon.ts";
import { makeSql } from "./helpers/pg.ts";

const SECRET = "patreon-webhook-secret";

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

function request(
  event: string,
  payload: unknown,
  { secret = SECRET, method = "POST" } = {},
): VercelRequest {
  const body = JSON.stringify(payload);
  return Object.assign(Readable.from([Buffer.from(body)]), {
    method,
    headers: {
      "x-patreon-event": event,
      "x-patreon-signature": createHmac("md5", secret)
        .update(body)
        .digest("hex"),
    },
  }) as unknown as VercelRequest;
}

const member = (status = "active_patron") => ({
  data: {
    type: "member",
    id: "m-1",
    attributes: {
      full_name: "Ana Souza",
      patron_status: status,
      email: "ana@example.com",
    },
    relationships: {
      currently_entitled_tiers: { data: [{ type: "tier", id: "t-friend" }] },
    },
  },
  included: [
    {
      type: "tier",
      id: "t-friend",
      attributes: { title: "Friend", amount_cents: 500 },
    },
  ],
});

let sql: Awaited<ReturnType<typeof makeSql>>;

async function call(req: VercelRequest) {
  const res = mockRes();
  await handler(req, res as unknown as VercelResponse, { sql });
  return res;
}

beforeEach(async () => {
  process.env.PATREON_WEBHOOK_SECRET = SECRET;
  sql = await makeSql(["053_patrons.sql"]);
});

afterEach(() => {
  delete process.env.PATREON_WEBHOOK_SECRET;
});

describe("api/webhooks/patreon", () => {
  it("stores a new patron and their tier, without the email", async () => {
    const res = await call(request("members:pledge:create", member()));
    expect(res.statusCode).toBe(200);
    const [row] = await sql`SELECT * FROM patrons`;
    expect(row).toMatchObject({
      member_id: "m-1",
      full_name: "Ana Souza",
      patron_status: "active_patron",
      tier_ids: ["t-friend"],
    });
    expect(JSON.stringify(row)).not.toContain("ana@example.com");
    expect(await sql`SELECT id, title FROM patreon_tiers`).toEqual([
      { id: "t-friend", title: "Friend" },
    ]);
  });

  it("updates status on a cancelled pledge", async () => {
    await call(request("members:pledge:create", member()));
    await call(request("members:pledge:delete", member("former_patron")));
    const [row] = await sql`SELECT patron_status FROM patrons`;
    expect(row.patron_status).toBe("former_patron");
  });

  it("blanks the name when the member is deleted", async () => {
    await call(request("members:create", member()));
    const res = await call(request("members:delete", member()));
    expect(res.statusCode).toBe(200);
    const [row] = await sql`SELECT full_name, patron_status FROM patrons`;
    expect(row).toEqual({ full_name: "", patron_status: null });
  });

  it("rejects a bad signature and stores nothing", async () => {
    const res = await call(
      request("members:create", member(), { secret: "wrong" }),
    );
    expect(res.statusCode).toBe(401);
    expect(await sql`SELECT * FROM patrons`).toEqual([]);
  });

  it("acknowledges events it doesn't handle", async () => {
    const res = await call(
      request("posts:publish", { data: { type: "post", id: "p" } }),
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, handled: false });
  });

  it("rejects non-POST and refuses to run unconfigured", async () => {
    expect(
      (await call(request("members:create", member(), { method: "GET" })))
        .statusCode,
    ).toBe(405);
    delete process.env.PATREON_WEBHOOK_SECRET;
    expect((await call(request("members:create", member()))).statusCode).toBe(
      500,
    );
  });

  it("returns 500 so Patreon retries when the database is unavailable", async () => {
    const res = mockRes();
    await handler(
      request("members:create", member()),
      res as unknown as VercelResponse,
      {
        sql: null,
      },
    );
    expect(res.statusCode).toBe(500);
  });
});
