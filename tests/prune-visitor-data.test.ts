import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeSql } from "./helpers/pg.ts";

let sql: Awaited<ReturnType<typeof makeSql>>;

vi.mock("../lib/db.ts", () => ({ getSql: () => sql }));

const authed = { headers: { authorization: "Bearer cron-secret" } };

function fakeRes() {
  return {
    statusCode: 0,
    body: undefined as unknown,
    json(body: unknown) {
      this.body = body;
    },
  };
}

beforeEach(async () => {
  process.env.CRON_SECRET = "cron-secret";
  sql = await makeSql([
    "035_visitor_rate_state.sql",
    "060_items_budget_events.sql",
  ]);
});

afterEach(async () => {
  delete process.env.CRON_SECRET;
  await sql.$close();
});

describe("prune-visitor-data", () => {
  it("rejects a caller without the cron secret", async () => {
    const { default: handler } = await import(
      "../lib/cron/prune-visitor-data.ts"
    );
    const res = fakeRes();
    await handler({ headers: {} }, res);
    expect(res.statusCode).toBe(401);
  });

  it("deletes old counters and stale item buckets, and nothing else", async () => {
    await sql.query(
      "INSERT INTO items_budget_events (day, visitor, kind, enforced) VALUES " +
        "(current_date - 31, 'old', 'items', false), (current_date - 1, 'new', 'items', false)",
    );
    await sql.query(
      "INSERT INTO visitor_fetch_state (ip, updated_at) VALUES " +
        "('items:old', now() - interval '3 days'), ('items:new', now()), " +
        "('img-visitor-old', now() - interval '30 days')",
    );
    const { default: handler } = await import(
      "../lib/cron/prune-visitor-data.ts"
    );
    const res = fakeRes();
    await handler(authed, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ events: 1, buckets: 1 });
    const left = await sql.query(
      "SELECT ip FROM visitor_fetch_state ORDER BY ip",
    );
    expect(left.map((r: { ip: string }) => r.ip)).toEqual([
      "img-visitor-old",
      "items:new",
    ]);
  });
});
