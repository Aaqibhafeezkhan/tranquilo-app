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
    "060_visitor_budget_events.sql",
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
        "('img:old', now() - interval '3 days'), ('img:new', now()), " +
        "('detail:old', now() - interval '3 days'), ('detail:new', now()), " +
        "('other-key', now() - interval '30 days')",
    );
    const { default: handler } = await import(
      "../lib/cron/prune-visitor-data.ts"
    );
    const res = fakeRes();
    await handler(authed, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ events: 1, buckets: 3 });
    const left = await sql.query(
      "SELECT ip FROM visitor_fetch_state ORDER BY ip",
    );
    expect(left.map((r: { ip: string }) => r.ip)).toEqual([
      "detail:new",
      "img:new",
      "items:new",
      "other-key",
    ]);
  });
});

describe("sql/061 hashed-key cleanup", () => {
  it("removes rows keyed on an address and keeps hashed ones", async () => {
    await sql.query(
      "INSERT INTO visitor_fetch_state (ip) VALUES " +
        "('203.0.113.7'), ('2001:db8::1'), ('items:0123456789abcdef'), ('img:0123456789abcdef')",
    );
    const { readFileSync } = await import("node:fs");
    await sql.$db.exec(
      readFileSync(
        new URL("../sql/061_visitor_state_hashed_keys.sql", import.meta.url),
        "utf8",
      ),
    );
    const left = await sql.query(
      "SELECT ip FROM visitor_fetch_state ORDER BY ip",
    );
    expect(left.map((r: { ip: string }) => r.ip)).toEqual([
      "img:0123456789abcdef",
      "items:0123456789abcdef",
    ]);
  });
});
